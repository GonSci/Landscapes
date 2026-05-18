#!/usr/bin/env python3
"""
Vision Worker Service - Multi-Stream Architecture
Processes all locations simultaneously with intelligent frame sampling
and YOLO model sharing to prevent lag.
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction
from sahi.models.base import DetectionModel
import threading
import time
from datetime import datetime
from dotenv import load_dotenv
import math

from extensions import db
from models import Location, SurveillanceLog
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'conf_threshold': 0.5,
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_clahe': True,
    'enable_blur': True,
}

YOLO_MODEL = None

# ── Issue 2 Fix: GPU Inference Worker ─────────────────────────────────────────
# Replace YOLO_LOCK (which serialized 5 threads and starved 4 at a time) with a
# dedicated worker thread that is the *sole owner of the GPU*.
# Camera threads drop frames in → pick annotated results out.  No lock needed.
import queue as _queue
INFERENCE_INPUT_QUEUE  = _queue.Queue(maxsize=10)   # (location_id, frame_proc) tuples
INFERENCE_OUTPUT_QUEUES = {}                         # location_id -> Queue(maxsize=2)

# Populated by detect_device() at startup — used throughout the module
DEVICE_INFO = {
    'device': 'cpu',        # 'cuda:0' | 'cpu'
    'use_tensorrt': False,  # True only when GTX 1660 Super (or any CUDA GPU with .engine)
    'gpu_name': None,       # e.g. 'NVIDIA GeForce GTX 1660 SUPER'
    'backend': 'pytorch',   # 'tensorrt' | 'pytorch'
}

# Multi-Stream Globals
THREAD_FRAMES = {}       # location_id -> jpeg frame bytes
THREAD_COUNTS = {}       # location_id -> current count
THREAD_MAX_COUNTS = {}   # location_id -> max count in interval
STREAM_LOCK = threading.Lock()

# Track last log time per location to avoid spamming
last_log_time_per_location = {}
last_log_time_lock = threading.Lock()

active_location_id = 1
active_location_lock = threading.Lock()


# ── Device Detection ───────────────────────────────────────────────────────────
def detect_device():
    """
    Probe the system for a CUDA-capable GPU.

    Priority order:
      1. CUDA GPU present + best.engine exists  →  TensorRT on cuda:0
      2. CUDA GPU present, no .engine file      →  PyTorch (best.pt) on cuda:0
      3. No CUDA GPU                            →  PyTorch (best.pt) on CPU

    Returns a filled-in copy of DEVICE_INFO.
    """
    info = {
        'device': 'cpu',
        'use_tensorrt': False,
        'gpu_name': None,
        'backend': 'pytorch',
    }

    try:
        import torch
        if not torch.cuda.is_available():
            print("[VISION] No CUDA GPU detected — running on CPU with best.pt")
            return info

        gpu_name = torch.cuda.get_device_name(0)
        info['device'] = 'cuda:0'
        info['gpu_name'] = gpu_name
        print(f"[VISION] GPU detected: {gpu_name}")

        engine_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'best.engine')
        engine_exists = os.path.exists(engine_path)

        if engine_exists:
            info['use_tensorrt'] = True
            info['backend'] = 'tensorrt'
            print(f"[VISION] TensorRT engine found at {engine_path} — using TensorRT backend")
        else:
            print(
                f"[VISION] No best.engine found at {engine_path}. "
                "Running PyTorch on GPU (best.pt). "
                "Export with: model.export(format='engine', half=True) to enable TensorRT."
            )

    except ImportError:
        print("[VISION] PyTorch not importable — falling back to CPU with best.pt")

    return info


# ── TensorRT SAHI Wrapper ──────────────────────────────────────────────────────
class TensorRTDetectionModel(DetectionModel):
    """
    Subclasses SAHI's DetectionModel so get_sliced_prediction() works
    identically to any native SAHI model — no manual ObjectPrediction
    construction, no version-specific constructor arguments.

    How it works:
      - load_model()  loads the .engine via ultralytics YOLO
      - perform_inference()  runs the engine on each tile and stores the
        raw ultralytics Results object in self._original_predictions
      - convert_original_predictions()  reads that raw result and fills
        self._object_prediction_list_per_image using SAHI's own internal
        format, which SAHI's postprocessing then merges across tiles

    This approach is immune to ObjectPrediction signature changes because
    SAHI owns all ObjectPrediction construction internally.
    """

    def __init__(self, engine_path: str, conf: float, device: str):
        # DetectionModel.__init__ expects (model_path, confidence_threshold, device, ...)
        # We call it with just the essentials; load_model() does the real work.
        super().__init__(
            model_path=engine_path,
            confidence_threshold=conf,
            device=device,
            category_mapping={0: 'person'},
            category_remapping=None,
            load_at_init=False,   # we call load_model() ourselves below
            image_size=None,
        )
        self.load_model()

    # ── Required overrides ─────────────────────────────────────────────────────

    def load_model(self):
        """Load the TensorRT .engine file via ultralytics."""
        from ultralytics import YOLO as UltralyticsYOLO
        self.model = UltralyticsYOLO(self.model_path, task='detect')
        self.set_model(self.model)
        print(f"[VISION] TensorRT engine loaded from {self.model_path} on {self.device}")

    def set_model(self, model):
        """Store the underlying model and sync the category mapping."""
        self.model = model
        # SAHI uses self.category_names for label lookup
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        """
        Run the TensorRT engine on a single tile (called by SAHI per-tile).
        Stores the raw ultralytics Results so convert_original_predictions()
        can turn them into SAHI's internal format.
        """
        self._original_predictions = self.model.predict(
            source=image,
            conf=self.confidence_threshold,
            device=self.device,
            classes=[0],   # person class only
            verbose=False,
            half=True,     # FP16 — required for a FP16 TensorRT engine
        )

    def convert_original_predictions(
        self,
        shift_amount=None,
        full_shape=None,
    ):
        """
        Translate the raw ultralytics Results stored by perform_inference()
        into the list of dicts that SAHI's postprocessing pipeline expects.

        SAHI reads self._object_prediction_list_per_image after this call.
        Each element is a list of ObjectPrediction-compatible dicts with keys:
          bbox, score, category_id, category_name, bool_mask, shift_amount, full_shape
        """
        from sahi.prediction import ObjectPrediction

        if shift_amount is None:
            shift_amount = [0, 0]

        object_prediction_list = []
        results = self._original_predictions

        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            img_h, img_w = results[0].orig_shape

            if full_shape is None:
                full_shape = [img_h, img_w]

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf   = float(boxes.conf[i].item())
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()

                # Build ObjectPrediction using only the stable positional
                # arguments that have existed across all SAHI versions:
                #   bbox, score, category_id, category_name,
                #   shift_amount, full_shape
                # 'bool_mask' was removed in newer SAHI — we omit it entirely.
                try:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2],
                        score=conf,
                        category_id=cls_id,
                        category_name='person',
                        shift_amount=shift_amount,
                        full_shape=full_shape,
                    )
                except TypeError:
                    # Older SAHI versions require bool_mask as positional arg
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2],
                        bool_mask=None,
                        score=conf,
                        category_id=cls_id,
                        category_name='person',
                        shift_amount=shift_amount,
                        full_shape=full_shape,
                    )

                object_prediction_list.append(pred)

        # SAHI expects a list-of-lists (one inner list per image in the batch)
        self._object_prediction_list_per_image = [object_prediction_list]


# ── Model Loader ───────────────────────────────────────────────────────────────
def load_model(device_info: dict):
    """
    Load the appropriate model based on detected device.

    Returns one of:
      - TensorRTDetectionModel     (GTX 1660 Super or any GPU + .engine present)
      - AutoDetectionModel (SAHI)  (GPU without .engine, or CPU fallback)

    Also logs a clear summary of what is being used and why.
    """
    conf  = DETECTION_CONFIG['conf_threshold']
    device = device_info['device']
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    if device_info['use_tensorrt']:
        # ── Path A: TensorRT ──────────────────────────────────────────────────
        engine_path = os.path.join(backend_dir, 'best.engine')
        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : TensorRT FP16")
        print(f"[VISION]  Model    : {engine_path}")
        print(f"[VISION]  Device   : {device}  ({device_info['gpu_name']})")
        print("[VISION] ══════════════════════════════════════════")
        return TensorRTDetectionModel(engine_path, conf=conf, device=device)

    else:
        # ── Path B: PyTorch via SAHI AutoDetectionModel ───────────────────────
        pt_path = os.path.join(backend_dir, 'best.pt')
        sahi_device = '0' if device == 'cuda:0' else 'cpu'

        if device == 'cuda:0':
            reason = "GPU detected but no best.engine — using PyTorch on GPU"
        else:
            reason = "No GPU detected — using PyTorch on CPU"

        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : PyTorch")
        print(f"[VISION]  Model    : {pt_path}")
        print(f"[VISION]  Device   : {device}")
        print(f"[VISION]  Reason   : {reason}")
        print("[VISION] ══════════════════════════════════════════")

        return AutoDetectionModel.from_pretrained(
            model_type='yolov8',
            model_path=pt_path,
            confidence_threshold=conf,
            device=sahi_device,
        )


# ── SAHI Inference Dispatcher ──────────────────────────────────────────────────
def run_sahi_inference(model, frame_proc: np.ndarray, device_info: dict):
    """
    Unified inference call that works for both TensorRT and PyTorch backends.

    For TensorRT (TensorRTDetectionModel):
        We call get_sliced_prediction() the same way — SAHI will call
        model.perform_inference() and model.convert_original_predictions()
        on each tile, which our wrapper handles.

    For PyTorch (AutoDetectionModel):
        Standard SAHI call, unchanged from before.

    Returns a SAHI PredictionResult with .object_prediction_list populated.
    """
    return get_sliced_prediction(
        frame_proc,
        model,
        slice_height=640,
        slice_width=640,
        overlap_height_ratio=0.15,
        overlap_width_ratio=0.15,
        postprocess_match_metric="IOU",
        postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
        postprocess_class_agnostic=True,
        verbose=False,
    )


# ── Path Helpers ───────────────────────────────────────────────────────────────
def resolve_video_path(video_name):
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    if os.path.isabs(video_name):
        return video_name if os.path.exists(video_name) else None

    candidates = [
        os.path.join(project_root, 'frontend', 'public', 'assets', video_name),
        os.path.join(project_root, 'public', 'assets', video_name),
        os.path.join(project_root, 'backend', video_name),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return None

# ── Image Processing Helpers ───────────────────────────────────────────────────
def apply_clahe(frame):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def apply_gaussian_blur(frame, detections_pixel, ksize=(51, 51)):
    blurred = frame.copy()
    h_img, w_img = frame.shape[:2]

    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)

        roi = blurred[y1:y2, x1:x2]
        if roi.size == 0: continue

        roi_h, roi_w = roi.shape[:2]
        kw = max(3, min(ksize[0], roi_w) | 1)
        kh = max(3, min(ksize[1], roi_h) | 1)
        blurred[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (kw, kh), 0)

    return blurred

def draw_detections_on_frame(frame, detections_pixel):
    annotated = frame.copy()
    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        confidence = det['confidence']
        color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        label = f"Person {confidence:.2f}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_y = max(y1, label_size[1] + 10)

        cv2.rectangle(annotated, (x1, label_y - label_size[1] - 10), (x1 + label_size[0], label_y + 5), color, -1)
        cv2.putText(annotated, label, (x1, label_y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    return annotated

def draw_cctv_overlay(frame, people_count, fps):
    overlay = frame.copy()
    h, w = frame.shape[:2]

    cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
    frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    count_text = f"PEOPLE: {people_count}"
    count_size = cv2.getTextSize(count_text, font, 0.8, 2)[0]
    cv2.putText(frame, count_text, ((w - count_size[0]) // 2, 30), font, 0.8, (0, 255, 0), 2)

    fps_text = f"FPS: {fps:.1f}"
    fps_size = cv2.getTextSize(fps_text, font, 0.6, 2)[0]
    cv2.putText(frame, fps_text, (w - fps_size[0] - 10, 30), font, 0.6, (0, 255, 255), 2)

    # Backend label so you can see what's running during testing
    backend_text = f"Backend: {DEVICE_INFO['backend'].upper()}"
    cv2.putText(frame, backend_text, (10, 30), font, 0.5, (200, 200, 200), 1)

    # Date at bottom right
    date_size = cv2.getTextSize(timestamp, font, 0.6, 2)[0]
    cv2.putText(frame, timestamp, (w - date_size[0] - 10, h - 10), font, 0.6, (255, 255, 255), 2)

    return frame

# ── GPU Inference Worker ───────────────────────────────────────────────────────
def gpu_inference_worker():
    """
    Single thread that owns the GPU exclusively.

    Reads (location_id, frame_proc) tuples from INFERENCE_INPUT_QUEUE, runs
    SAHI inference, and puts the raw SAHI result into the matching per-location
    output queue.  Because only this thread ever touches YOLO_MODEL there is no
    lock anywhere — contention is eliminated by design.

    Background streams (0.2 FPS) submit frames infrequently, so the worker is
    idle most of the time and the active stream gets the GPU almost exclusively.
    """
    global YOLO_MODEL
    print("[VISION] GPU inference worker started")
    while True:
        try:
            location_id, frame_proc = INFERENCE_INPUT_QUEUE.get()
            # Sync conf threshold from config (safe — only this thread reads model)
            YOLO_MODEL.confidence_threshold = DETECTION_CONFIG['conf_threshold']
            results = run_sahi_inference(YOLO_MODEL, frame_proc, DEVICE_INFO)
            INFERENCE_OUTPUT_QUEUES[location_id].put(results)
        except Exception as e:
            print(f"[VISION] gpu_inference_worker error: {e}")
            # Put a sentinel so camera_thread doesn't block forever
            try:
                INFERENCE_OUTPUT_QUEUES[location_id].put(None)
            except Exception:
                pass


# ── YOLO Pipeline ──────────────────────────────────────────────────────────────
def run_yolo_pipeline(frame, location_id, annotate=True):
    """
    Per-camera pipeline.  CPU-bound work (CLAHE, annotation) stays here so the
    5 camera threads can do it in parallel.  Only the SAHI call goes through the
    single GPU worker thread via the input/output queues.

    Args:
        frame       : raw BGR frame from the camera thread
        location_id : used to route results back to the correct output queue
        annotate    : draw boxes and apply privacy blur when True
    """
    start_time = time.time()

    # CPU: preprocessing
    frame_proc = apply_clahe(frame) if DETECTION_CONFIG['enable_clahe'] else frame.copy()

    # GPU (via worker): submit and block until this location's result arrives
    INFERENCE_INPUT_QUEUE.put((location_id, frame_proc))
    results = INFERENCE_OUTPUT_QUEUES[location_id].get()

    h, w = frame.shape[:2]
    detections_pixel = []
    detections_pct = []

    if results is not None:
        for obj in results.object_prediction_list:
            if obj.category.id != 0:
                continue  # person class only

            x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
            conf = obj.score.value

            bw, bh = x2 - x1, y2 - y1
            if bw > (w * 0.6) or bh > (h * 0.6):
                continue
            if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
                continue

            detections_pixel.append({'bbox': [int(x1), int(y1), int(x2), int(y2)], 'confidence': conf})
            detections_pct.append({
                'bbox': [float(x1)/w, float(y1)/h, float(x2)/w, float(y2)/h],
                'confidence': conf,
            })

    # CPU: annotation
    output_frame = frame.copy()
    if annotate and detections_pixel:
        if DETECTION_CONFIG['enable_blur']:
            output_frame = apply_gaussian_blur(output_frame, detections_pixel)
        output_frame = draw_detections_on_frame(output_frame, detections_pixel)

    fps = 1.0 / (time.time() - start_time)
    return output_frame, detections_pct, detections_pixel, fps

# ── Database Logging ───────────────────────────────────────────────────────────
def log_detection_to_database(app_context, location_id, people_count, confidence_avg):
    try:
        with app_context():
            location = Location.query.get(location_id)
            if not location: return False

            log_entry = SurveillanceLog(
                location_id=location_id,
                location_name=location.name,
                people_count=people_count,
                confidence_avg=confidence_avg
            )
            db.session.add(log_entry)
            db.session.commit()
            print(f"[VISION] Logged {people_count} people for {location.name}")
            return True
    except Exception as e:
        try:
            with app_context():
                db.session.rollback()
        except:
            pass
        print(f"[VISION] Database error: {e}")
        return False

# ── Independent Camera Thread ──────────────────────────────────────────────────
def camera_thread(app_context, location_id, video_name, location_name):
    global THREAD_FRAMES, THREAD_COUNTS, THREAD_MAX_COUNTS
    
    video_path = resolve_video_path(video_name)
    if not video_path:
        print(f"[VISION] Video {video_name} not found for {location_name}")
        return
        
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[VISION] Failed to open {video_path}")
        return

    fps_video = cap.get(cv2.CAP_PROP_FPS) or 30
    print(f"[VISION] Thread started for {location_name}")
    
    # Initialize globals for this thread
    with STREAM_LOCK:
        THREAD_COUNTS[location_id] = 0
        THREAD_MAX_COUNTS[location_id] = 0

    playback_start_time = time.time()
    last_log_time = time.time() - 61

    while True:
        try:
            # 1. Determine priority and framerate based on active location
            with active_location_lock:
                is_active = (location_id == active_location_id)
                
            target_fps = 30.0 if is_active else 0.2 # 30 FPS if active, 1 frame per 5 sec if background
            sleep_time = 1.0 / target_fps
            
            # Wall-clock sync to skip frames and keep video playing in real-time speed
            elapsed = time.time() - playback_start_time
            target_frame = int(elapsed * fps_video)
            current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

            frames_to_skip = target_frame - current_frame
            if frames_to_skip > 0:
                skip_count = min(frames_to_skip, int(fps_video)) # Skip up to 1s of frames
                for _ in range(skip_count):
                    cap.grab()

            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                playback_start_time = time.time()
                continue

            # 2. Process frame (CPU pre/post-processing here; GPU call routed via worker)
            output_frame, detections_pct, detections_pixel, fps = run_yolo_pipeline(frame, location_id, annotate=True)
            
            current_count = len(detections_pixel)
            
            # Draw CCTV overlay
            output_frame = draw_cctv_overlay(output_frame, current_count, fps)

            # 3. Update Stream Globals
            ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                with STREAM_LOCK:
                    THREAD_FRAMES[location_id] = buffer.tobytes()
                    THREAD_COUNTS[location_id] = current_count
                    if current_count > THREAD_MAX_COUNTS[location_id]:
                        THREAD_MAX_COUNTS[location_id] = current_count

            # 4. Database Logging (Every 60s or on Spike)
            now = time.time()
            time_since_last_log = now - last_log_time

            with STREAM_LOCK:
                peak_count = THREAD_MAX_COUNTS[location_id]

            # Dynamic Spike Detection thresholds per location
            location_high_thresholds = {1: 15, 2: 38, 3: 14, 4: 15, 5: 66}
            high_threshold = location_high_thresholds.get(location_id, 10)
            is_high_density = peak_count >= high_threshold

            if time_since_last_log >= 60 or (is_high_density and time_since_last_log >= 10):
                with STREAM_LOCK:
                    THREAD_MAX_COUNTS[location_id] = 0
                
                conf_avg = sum(d['confidence'] for d in detections_pct) / len(detections_pct) if detections_pct else None
                if log_detection_to_database(app_context, location_id, peak_count, conf_avg):
                    last_log_time = now

            # Sleep to enforce frame rate and yield CPU
            time.sleep(sleep_time)
            
        except Exception as e:
            print(f"[VISION] Error in thread for {location_name}: {e}")
            time.sleep(1)

# ── Mini Flask Streaming Server ───────────────────────────────────────────────
def generate_mjpeg_stream():
    while True:
        with active_location_lock:
            current_loc = active_location_id
            
        with STREAM_LOCK:
            frame_data = THREAD_FRAMES.get(current_loc)
            
        if frame_data is None:
            time.sleep(0.1)
            continue
            
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
        time.sleep(1.0 / 30.0) # Broadcaster runs at 30 FPS max

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/video_feed')
def video_feed():
    return Response(generate_mjpeg_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/live-count', methods=['GET'])
def live_count():
    with active_location_lock:
        current_loc = active_location_id
    with STREAM_LOCK:
        count = THREAD_COUNTS.get(current_loc, 0)
    return jsonify({'count': count})

@app.route('/yolo/config', methods=['POST'])
def update_yolo_config():
    data = request.json
    if 'enable_clahe' in data: DETECTION_CONFIG['enable_clahe'] = data['enable_clahe']
    if 'enable_blur' in data: DETECTION_CONFIG['enable_blur'] = data['enable_blur']
    return jsonify({'status': 'success', 'config': DETECTION_CONFIG})

@app.route('/device-info', methods=['GET'])
def device_info_route():
    """Expose what backend/device is currently running — useful for debugging."""
    return jsonify(DEVICE_INFO)

def db_polling_thread(app_context):
    global active_location_id
    while True:
        try:
            with app_context():
                active_loc = Location.query.filter_by(is_active=True).first()
                if active_loc:
                    with active_location_lock:
                        if active_location_id != active_loc.id:
                            print(f"[VISION] Dashboard switch -> {active_loc.name}")
                            active_location_id = active_loc.id
        except Exception as e:
            pass
        time.sleep(1)

if __name__ == '__main__':
    # ── Step 1: Detect device and choose backend ───────────────────────────────
    DEVICE_INFO.update(detect_device())

    # ── Step 2: Load the correct model with fallback chain ────────────────────
    print("[VISION] Loading model...")
    try:
        YOLO_MODEL = load_model(DEVICE_INFO)
    except Exception as e:
        print(f"[VISION] Primary model load failed: {e}")
        print("[VISION] Attempting CPU fallback with best.pt...")
        try:
            DEVICE_INFO.update({'device': 'cpu', 'use_tensorrt': False, 'backend': 'pytorch'})
            YOLO_MODEL = load_model(DEVICE_INFO)
        except Exception as fallback_err:
            print(f"[VISION] FATAL: CPU fallback also failed: {fallback_err}")
            raise

    print(f"[VISION] Model ready. Backend={DEVICE_INFO['backend']} Device={DEVICE_INFO['device']}")
    
    with app.app_context():
        db.create_all()
        locations = Location.query.all()
        
        # Start DB Polling Thread
        threading.Thread(target=db_polling_thread, args=(app.app_context,), daemon=True).start()
        
        # Issue 2 Fix: create per-location output queues, then start the single GPU worker
        for loc in locations:
            if loc.video_filename:
                INFERENCE_OUTPUT_QUEUES[loc.id] = _queue.Queue(maxsize=2)
        threading.Thread(target=gpu_inference_worker, daemon=True).start()

        # Start Camera Threads
        for loc in locations:
            if loc.video_filename:
                threading.Thread(
                    target=camera_thread,
                    args=(app.app_context, loc.id, loc.video_filename, loc.name),
                    daemon=True
                ).start()
    
    print("[VISION] Starting Multi-Stream MJPEG Server on port 5002...")
    app.run(host='0.0.0.0', port=5002, debug=False, threaded=True, use_reloader=False)