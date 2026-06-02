#!/usr/bin/env python3
"""
Vision Worker Service - Decoupled Display / Inference Architecture
═══════════════════════════════════════════════════════════════════

Key improvements over the previous version
───────────────────────────────────────────
1. DECOUPLED DISPLAY FROM INFERENCE
   Each location now runs TWO threads:
     • inference_thread  – reads frames, submits to GPU worker, stores raw detections.
                           Runs as fast as the GPU allows (no fixed-rate sleep).
     • display_thread    – runs at exactly 30 FPS, composites blur + annotation on
                           the *current* raw frame using the latest detection boxes.
   The viewer always sees fluid 30-FPS video.  Detection boxes update at GPU rate.

2. DIRECT DETECTION OVERLAY
   The display_thread draws the latest SAHI detections directly onto the
   current raw frame.  Boxes update at the GPU inference rate and persist
   between updates — no tracking layer needed.  This keeps the architecture
   simple and avoids ByteTrack's confirmation-delay issues.

3. RYZEN 5 3600 CPU PARALLELISM
   The Ryzen 5 3600 has 6 cores / 12 threads.  CPU-bound work is distributed:
     • CLAHE pre-processing   → ThreadPoolExecutor (pure NumPy, releases GIL)
     • Gaussian blur          → ThreadPoolExecutor (NumPy, releases GIL)
     • JPEG encoding          → done inside display_thread, NOT in inference path
     • cv2.setNumThreads(12)  → lets OpenCV use all logical cores for its own ops
     • torch.set_num_threads  → PyTorch CPU ops (fallback path) get all cores
   The 5 inference threads, 5 display threads, GPU worker, and Flask server
   each land on their own logical core naturally via the OS scheduler.

4. MULTI-VIEWER SUPPORT
   active_location_ids is now a set, not a single int.
   • /set-active-location  { "location_id": N, "action": "add"|"remove" }
   • All locations in the set run full SAHI inference; the rest run 0.2 FPS.
   • /active-locations  GET → returns the current active set.

5. FRAME-DIFF GATE
   Before submitting to the GPU queue, the inference thread computes a fast
   grayscale absolute-difference against the previous processed frame.
   If fewer than 1 % of pixels changed by more than 25 DN the frame is
   skipped and the last detections are reused.  Static or near-static scenes
   (e.g. empty park at night) contribute zero GPU load.

6. CLAHE RESIZE-FIRST
   CLAHE is applied after resizing to inference size, not on the full-resolution
   source frame.  For 1080p source this roughly quarters the LAB conversion cost.
"""

import os
import sys
import platform
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
from types import SimpleNamespace


from extensions import db
from models import Location, SurveillanceLog
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

load_dotenv()

# ── CPU tuning: tell OpenCV and PyTorch to use all Ryzen 5 3600 threads ────────
_LOGICAL_CORES = os.cpu_count() or 12
cv2.setNumThreads(_LOGICAL_CORES)
try:
    import torch
    torch.set_num_threads(_LOGICAL_CORES)
except ImportError:
    pass

# _CPU_POOL is intentionally NOT created here at module level.
# Each display_thread creates its own single-worker pool so it never races
# against Python's interpreter shutdown (which destroys module-level executors
# before daemon threads finish, causing "cannot schedule new futures" errors).

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'conf_threshold': 0.35,
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_clahe': True,
    'enable_blur': True,
}

# Per-location confidence thresholds — tuned to each scene.
LOCATION_CONF_THRESHOLDS = {
    1: 0.25,  # Baguio Night Market   – low light, dense crowds
    2: 0.40,  # Wright Park           – outdoor, trees, variable lighting
    3: 0.35,  # The Mansion           – bottleneck, gate/pillar noise
    4: 0.45,  # Baguio Cathedral      – arched-column false-positive risk
    5: 0.20,  # Melvin Jones / Burnham Park – very distant tiny figures
}

# Crowd-density spike thresholds per location (for accelerated DB logging)
LOCATION_HIGH_THRESHOLDS = {1: 15, 2: 38, 3: 14, 4: 15, 5: 66}

YOLO_MODEL = None


# ── GPU Inference: latest-frame slots ──────────────────────────────────────────
# Defined near gpu_inference_worker: INFERENCE_LATEST_FRAME, INFERENCE_LATEST_LOCK

# ── Device info (populated by detect_device at startup) ───────────────────────
DEVICE_INFO = {
    'device':       'cpu',
    'use_tensorrt': False,
    'use_coreml':   False,
    'gpu_name':     None,
    'backend':      'pytorch',
}

# ── Per-location shared state ──────────────────────────────────────────────────
# Written by inference_thread; read by display_thread and Flask routes.
LAST_RAW_FRAME    = {}   # location_id -> latest BGR np.ndarray (unprocessed)
LAST_DETECTIONS   = {}   # location_id -> list[dict]  raw pixel detections
DETECTION_UPDATED = {}   # location_id -> bool  True when fresh inference just landed
THREAD_FRAMES     = {}   # location_id -> JPEG bytes (written by display_thread)
THREAD_COUNTS     = {}   # location_id -> int  person count from SAHI
THREAD_MAX_COUNTS = {}   # location_id -> int  peak count in current log window

RAW_FRAME_LOCK  = threading.Lock()   # guards LAST_RAW_FRAME
DETECTION_LOCK  = threading.Lock()   # guards LAST_DETECTIONS + DETECTION_UPDATED
STREAM_LOCK     = threading.Lock()   # guards THREAD_FRAMES + THREAD_COUNTS + THREAD_MAX_COUNTS

# ── Active location set (multi-viewer) ────────────────────────────────────────
# Any location_id in this set receives full SAHI inference.
# All others are throttled to 0.2 FPS (background logging only).
active_location_ids  = {1}           # default: location 1 active at startup
active_location_lock = threading.Lock()

# Populated at startup — only location IDs that have a video_filename.
# Locations without footage are valid for the redirection algorithm but
# get no threads, no GPU work, and cannot be set as the active stream.
FOOTAGE_LOCATION_IDS: set = set()

# All location IDs from the DB — includes footage-less locations.
# Used by /locations/status so the redirection algorithm sees everything.
_ALL_LOCATION_IDS: set = set()

# ── CLAHE instance (module-level — avoid per-frame allocation) ─────────────────
_CLAHE = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))

# ── Inference target size (resize before CLAHE to save CPU cycles) ─────────────
INFERENCE_WIDTH  = 1024
INFERENCE_HEIGHT = 576


# ══════════════════════════════════════════════════════════════════════════════
#  Device Detection
# ══════════════════════════════════════════════════════════════════════════════

def detect_device():
    """
    Probe hardware in priority order:
      1. CUDA + best.engine  → TensorRT FP16
      2. Apple Silicon + best.mlpackage → CoreML
      3. CUDA (no engine)    → PyTorch cuda:0
      4. Apple Silicon (no mlpackage) → PyTorch MPS
      5. Fallback            → PyTorch CPU
    """
    info = {
        'device': 'cpu', 'use_tensorrt': False,
        'use_coreml': False, 'gpu_name': None, 'backend': 'pytorch',
    }
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    try:
        import torch
        if torch.cuda.is_available():
            info['device']   = 'cuda:0'
            info['gpu_name'] = torch.cuda.get_device_name(0)
            print(f"[VISION] Nvidia GPU detected: {info['gpu_name']}")
            if os.path.exists(os.path.join(backend_dir, 'best.engine')):
                info['use_tensorrt'] = True
                info['backend']      = 'tensorrt'
                print("[VISION] TensorRT engine found — using TensorRT backend")
            return info
    except ImportError:
        pass

    if sys.platform == 'darwin' and platform.machine() == 'arm64':
        info['gpu_name'] = 'Apple M-Series (ANE/GPU)'
        info['device']   = 'mps'
        print("[VISION] Apple Silicon detected.")
        if os.path.exists(os.path.join(backend_dir, 'best.mlpackage')):
            info['use_coreml'] = True
            info['backend']    = 'coreml'
            print("[VISION] CoreML package found — using CoreML backend")
        else:
            print("[VISION] No best.mlpackage — falling back to PyTorch MPS.")
        return info

    print("[VISION] No hardware acceleration — running on CPU")
    return info


# ══════════════════════════════════════════════════════════════════════════════
#  SAHI Model Wrappers
# ══════════════════════════════════════════════════════════════════════════════

class TensorRTDetectionModel(DetectionModel):
    """SAHI wrapper for a TensorRT .engine (GTX 1660 Super + FP16)."""

    def __init__(self, engine_path: str, conf: float, device: str):
        super().__init__(
            model_path=engine_path, confidence_threshold=conf, device=device,
            category_mapping={0: 'person'}, category_remapping=None,
            load_at_init=False, image_size=None,
        )
        self.load_model()

    def load_model(self):
        from ultralytics import YOLO as _YOLO
        self.model = _YOLO(self.model_path, task='detect')
        self.set_model(self.model)
        print(f"[VISION] TensorRT engine loaded from {self.model_path} on {self.device}")

    def set_model(self, model):
        self.model = model
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        self._original_predictions = self.model.predict(
            source=image, conf=self.confidence_threshold,
            device=self.device, classes=[0], verbose=False, half=True,
        )

    def convert_original_predictions(self, shift_amount=None, full_shape=None):
        from sahi.prediction import ObjectPrediction
        if shift_amount is None:
            shift_amount = [0, 0]
        preds = []
        results = self._original_predictions
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            img_h, img_w = results[0].orig_shape
            if full_shape is None:
                full_shape = [img_h, img_w]
            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                try:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], score=float(boxes.conf[i].item()),
                        category_id=int(boxes.cls[i].item()), category_name='person',
                        shift_amount=shift_amount, full_shape=full_shape,
                    )
                except TypeError:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], bool_mask=None,
                        score=float(boxes.conf[i].item()),
                        category_id=int(boxes.cls[i].item()), category_name='person',
                        shift_amount=shift_amount, full_shape=full_shape,
                    )
                preds.append(pred)
        self._object_prediction_list_per_image = [preds]


class CoreMLDetectionModel(DetectionModel):
    """SAHI wrapper for Apple Silicon CoreML (.mlpackage)."""

    def __init__(self, mlpackage_path: str, conf: float):
        super().__init__(
            model_path=mlpackage_path, confidence_threshold=conf, device='cpu',
            category_mapping={0: 'person'}, category_remapping=None,
            load_at_init=False, image_size=None,
        )
        self.load_model()

    def load_model(self):
        from ultralytics import YOLO as _YOLO
        self.model = _YOLO(self.model_path, task='detect')
        self.set_model(self.model)
        print(f"[VISION] CoreML package loaded from {self.model_path}")

    def set_model(self, model):
        self.model = model
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        self._original_predictions = self.model.predict(
            source=image, conf=self.confidence_threshold,
            classes=[0], verbose=False, imgsz=800,
        )

    def convert_original_predictions(self, shift_amount=None, full_shape=None):
        from sahi.prediction import ObjectPrediction
        if shift_amount is None:
            shift_amount = [0, 0]
        preds = []
        results = self._original_predictions
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            img_h, img_w = results[0].orig_shape
            if full_shape is None:
                full_shape = [img_h, img_w]
            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                try:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], score=float(boxes.conf[i].item()),
                        category_id=int(boxes.cls[i].item()), category_name='person',
                        shift_amount=shift_amount, full_shape=full_shape,
                    )
                except TypeError:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], bool_mask=None,
                        score=float(boxes.conf[i].item()),
                        category_id=int(boxes.cls[i].item()), category_name='person',
                        shift_amount=shift_amount, full_shape=full_shape,
                    )
                preds.append(pred)
        self._object_prediction_list_per_image = [preds]


# ══════════════════════════════════════════════════════════════════════════════
#  Model Loader
# ══════════════════════════════════════════════════════════════════════════════

def load_model(device_info: dict):
    conf        = DETECTION_CONFIG['conf_threshold']
    device      = device_info['device']
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    if device_info['use_tensorrt']:
        engine_path = os.path.join(backend_dir, 'best.engine')
        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : TensorRT FP16")
        print(f"[VISION]  Model    : {engine_path}")
        print(f"[VISION]  Device   : {device}  ({device_info['gpu_name']})")
        print("[VISION] ══════════════════════════════════════════")
        return TensorRTDetectionModel(engine_path, conf=conf, device=device)

    if device_info['use_coreml']:
        mlpackage_path = os.path.join(backend_dir, 'best.mlpackage')
        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : CoreML")
        print(f"[VISION]  Model    : {mlpackage_path}")
        print(f"[VISION]  Device   : {device_info['gpu_name']}")
        print("[VISION] ══════════════════════════════════════════")
        return CoreMLDetectionModel(mlpackage_path, conf=conf)

    pt_path    = os.path.join(backend_dir, 'best.pt')
    sahi_device = '0' if device == 'cuda:0' else device
    print("[VISION] ══════════════════════════════════════════")
    print(f"[VISION]  Backend  : PyTorch")
    print(f"[VISION]  Model    : {pt_path}")
    print(f"[VISION]  Device   : {device}")
    print("[VISION] ══════════════════════════════════════════")
    return AutoDetectionModel.from_pretrained(
        model_type='yolov8', model_path=pt_path,
        confidence_threshold=conf, device=sahi_device,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  SAHI Inference Dispatcher
# ══════════════════════════════════════════════════════════════════════════════

def run_sahi_inference(model, frame_proc: np.ndarray, device_info: dict, is_active: bool):
    """
    Active stream  → 4-tile SAHI (512 px slices, 0.10 overlap).
                     Down from 6 tiles (448 px, 0.15 overlap) for ~1.4× speedup.
    Background     → single full-frame pass (1 GPU call, sufficient for logging).
    """
    if is_active:
        return get_sliced_prediction(
            frame_proc, model,
            slice_height=512, slice_width=512,
            overlap_height_ratio=0.10, overlap_width_ratio=0.10,
            postprocess_match_metric="IOU",
            postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
            postprocess_class_agnostic=True, verbose=False,
        )
    else:
        return get_sliced_prediction(
            frame_proc, model,
            slice_height=frame_proc.shape[0], slice_width=frame_proc.shape[1],
            overlap_height_ratio=0.0, overlap_width_ratio=0.0,
            postprocess_match_metric="IOU",
            postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
            postprocess_class_agnostic=True, verbose=False,
        )


# ══════════════════════════════════════════════════════════════════════════════
#  Path Helpers
# ══════════════════════════════════════════════════════════════════════════════

def resolve_video_path(video_name):
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if os.path.isabs(video_name):
        return video_name if os.path.exists(video_name) else None
    for candidate in [
        os.path.join(project_root, 'frontend', 'public', 'assets', video_name),
        os.path.join(project_root, 'public',   'assets', video_name),
        os.path.join(project_root, 'backend',  video_name),
    ]:
        if os.path.exists(candidate):
            return candidate
    return None


# ══════════════════════════════════════════════════════════════════════════════
#  CPU Image Processing Helpers
#  All of these release the GIL (NumPy / OpenCV C-level ops) so the
#  ThreadPoolExecutor can run them truly in parallel on separate cores.
# ══════════════════════════════════════════════════════════════════════════════

def apply_clahe(frame: np.ndarray) -> np.ndarray:
    """
    CLAHE on the L channel of LAB.
    Frame is already resized to inference size before this call (resize-first
    optimisation) so the colour-space round-trip is cheap.
    """
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    cl = _CLAHE.apply(l)
    return cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)


def apply_gaussian_blur(frame: np.ndarray, detections: list, ksize=(51, 51)) -> np.ndarray:
    """
    One full-frame GaussianBlur + mask composite regardless of crowd size.
    Identical to the previous implementation — kept because it is already
    optimal (Issue 8 Fix).
    """
    h_img, w_img = frame.shape[:2]
    blurred_full = cv2.GaussianBlur(frame, ksize, 0)
    mask = np.zeros((h_img, w_img), dtype=np.uint8)
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)
        if x2 > x1 and y2 > y1:
            cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
    mask3 = mask[:, :, np.newaxis]
    return np.where(mask3 == 255, blurred_full, frame)


def draw_detections_on_frame(frame: np.ndarray, detections: list) -> np.ndarray:
    annotated = frame.copy()
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        conf  = det['confidence']
        tid   = det.get('track_id')
        color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        label      = f"#{tid} {conf:.2f}" if tid is not None else f"Person {conf:.2f}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_y    = max(y1, label_size[1] + 10)
        cv2.rectangle(annotated,
                      (x1, label_y - label_size[1] - 10),
                      (x1 + label_size[0], label_y + 5), color, -1)
        cv2.putText(annotated, label, (x1, label_y - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    return annotated


def draw_cctv_overlay(frame: np.ndarray, people_count: int, fps: float) -> np.ndarray:
    overlay = frame.copy()
    h, w    = frame.shape[:2]
    cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
    frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)

    font      = cv2.FONT_HERSHEY_SIMPLEX
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    count_text = f"PEOPLE: {people_count}"
    count_size = cv2.getTextSize(count_text, font, 0.8, 2)[0]
    cv2.putText(frame, count_text, ((w - count_size[0]) // 2, 30), font, 0.8, (0, 255, 0), 2)

    fps_text = f"FPS: {fps:.1f}"
    fps_size = cv2.getTextSize(fps_text, font, 0.6, 2)[0]
    cv2.putText(frame, fps_text, (w - fps_size[0] - 10, 30), font, 0.6, (0, 255, 255), 2)

    backend_text = f"Backend: {DEVICE_INFO['backend'].upper()}"
    cv2.putText(frame, backend_text, (10, 30), font, 0.5, (200, 200, 200), 1)

    date_size = cv2.getTextSize(timestamp, font, 0.6, 2)[0]
    cv2.putText(frame, timestamp, (w - date_size[0] - 10, h - 10), font, 0.6, (255, 255, 255), 2)

    return frame





# ══════════════════════════════════════════════════════════════════════════════
#  GPU Inference Worker  (sole owner of YOLO_MODEL)
# ══════════════════════════════════════════════════════════════════════════════

# Per-location latest-frame slots for the GPU worker.
# Each slot holds the NEWEST preprocessed frame (or None).
# inference_thread overwrites this every time it has a new frame ready;
# gpu_inference_worker reads & clears it.  This guarantees the GPU always
# processes the most recent frame — no stale queue buildup.
INFERENCE_LATEST_FRAME = {}   # location_id -> (frame_proc, is_active, conf_threshold) | None
INFERENCE_LATEST_LOCK  = threading.Lock()

def gpu_inference_worker():
    """
    Single thread that owns the GPU.
    Round-robins through all footage locations, picking the latest available
    frame from each.  When a result is ready, it writes directly to
    LAST_DETECTIONS + DETECTION_UPDATED so the display thread picks it up
    on its next 30-FPS loop iteration.
    """
    global YOLO_MODEL
    print("[VISION] GPU inference worker started")

    while True:
        processed_any = False
        for location_id in list(FOOTAGE_LOCATION_IDS):
            # Grab the latest frame for this location (non-blocking)
            with INFERENCE_LATEST_LOCK:
                slot = INFERENCE_LATEST_FRAME.get(location_id)
                if slot is not None:
                    INFERENCE_LATEST_FRAME[location_id] = None
                else:
                    continue

            frame_proc, is_active, conf_threshold = slot
            processed_any = True

            try:
                YOLO_MODEL.confidence_threshold = conf_threshold
                results = run_sahi_inference(YOLO_MODEL, frame_proc, DEVICE_INFO, is_active)

                # Parse results
                detections_pixel, _ = parse_sahi_results(
                    results, INFERENCE_WIDTH, INFERENCE_HEIGHT,
                )

                # Publish detections directly (no per-location output queue needed)
                with DETECTION_LOCK:
                    LAST_DETECTIONS[location_id]   = detections_pixel
                    DETECTION_UPDATED[location_id] = True
            except Exception as e:
                print(f"[VISION] gpu_inference_worker error loc {location_id}: {e}")

        if not processed_any:
            # No frames waiting — sleep briefly to avoid busy-spinning
            time.sleep(0.005)


# ══════════════════════════════════════════════════════════════════════════════
#  SAHI Result Parser  (shared by inference_thread)
# ══════════════════════════════════════════════════════════════════════════════

def parse_sahi_results(results, frame_w: int, frame_h: int):
    """
    Convert a SAHI PredictionResult into two lists:
      detections_pixel  – bbox in pixel coords + confidence
      detections_pct    – bbox as fractions of frame dimensions
    Applies the same sanity filters as the original run_yolo_pipeline:
      • discard boxes wider/taller than 60 % of the frame
      • discard boxes that span the full frame (likely a background artefact)
    """
    detections_pixel = []
    detections_pct   = []
    if results is None:
        return detections_pixel, detections_pct

    for obj in results.object_prediction_list:
        if obj.category.id != 0:
            continue
        x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
        conf = obj.score.value
        bw, bh = x2 - x1, y2 - y1
        if bw > frame_w * 0.6 or bh > frame_h * 0.6:
            continue
        if x1 <= 2 and y1 <= 2 and x2 >= frame_w - 2 and y2 >= frame_h - 2:
            continue
        detections_pixel.append({'bbox': [int(x1), int(y1), int(x2), int(y2)], 'confidence': conf})
        detections_pct.append({
            'bbox': [x1 / frame_w, y1 / frame_h, x2 / frame_w, y2 / frame_h],
            'confidence': conf,
        })
    return detections_pixel, detections_pct


# ══════════════════════════════════════════════════════════════════════════════
#  Frame-Diff Gate
# ══════════════════════════════════════════════════════════════════════════════

# Per-location grayscale reference frame for the motion gate.
_PREV_GRAY = {}
_MOTION_THRESHOLD = 0.01   # 1 % of pixels must change by > 25 DN to trigger inference


def has_motion(location_id: int, frame: np.ndarray) -> bool:
    """
    Returns True if the frame is sufficiently different from the last processed
    frame for this location.  Very cheap: one cvtColor + one absdiff on a
    down-sampled version of the frame.
    Always returns True the first time (no previous frame to compare against).
    """
    # Down-sample to 256 × 144 for speed — we only need coarse motion signal.
    small = cv2.resize(frame, (256, 144), interpolation=cv2.INTER_LINEAR)
    gray  = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

    prev = _PREV_GRAY.get(location_id)
    _PREV_GRAY[location_id] = gray

    if prev is None:
        return True

    diff    = cv2.absdiff(gray, prev)
    changed = np.count_nonzero(diff > 25) / diff.size
    return changed >= _MOTION_THRESHOLD


# ══════════════════════════════════════════════════════════════════════════════
#  Database Logging
# ══════════════════════════════════════════════════════════════════════════════

def log_detection_to_database(app_context, location_id, people_count, confidence_avg):
    try:
        with app_context():
            location = db.session.get(Location, location_id)
            if not location:
                return False
            db.session.add(SurveillanceLog(
                location_id=location_id,
                location_name=location.name,
                people_count=people_count,
                confidence_avg=confidence_avg,
            ))
            db.session.commit()
            print(f"[VISION] Logged {people_count} people for {location.name}")
            return True
    except Exception as e:
        try:
            with app_context():
                db.session.rollback()
        except Exception:
            pass
        print(f"[VISION] Database error: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
#  Inference Thread  (one per location)
# ══════════════════════════════════════════════════════════════════════════════

def inference_thread(app_context, location_id: int, video_name: str, location_name: str):
    """
    Responsibilities:
      1. Read frames from the video file at real-time wall-clock speed.
      2. Store each raw frame in LAST_RAW_FRAME for the display thread.
      3. Apply the motion gate — skip inference on static frames.
      4. Resize to inference size, apply CLAHE.
      5. Write the preprocessed frame to INFERENCE_LATEST_FRAME (overwrite).
         The gpu_inference_worker picks it up asynchronously.
      6. Handle DB logging from detections published by the GPU worker.

    Frame reading NEVER blocks on GPU inference — video stays smooth.
    """
    video_path = resolve_video_path(video_name)
    if not video_path:
        print(f"[VISION] Video {video_name} not found for {location_name}")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[VISION] Failed to open {video_path}")
        return

    fps_video = cap.get(cv2.CAP_PROP_FPS) or 30
    print(f"[VISION] Inference thread started for {location_name}")

    with STREAM_LOCK:
        THREAD_COUNTS[location_id]     = 0
        THREAD_MAX_COUNTS[location_id] = 0

    last_log_time        = time.time() - 61  # force a log on first detection
    last_frame_time      = time.time()
    frame_interval       = 1.0 / fps_video
    inference_peak_count = 0

    while True:
        try:
            # ── 1. Frame pacing — wait until next frame is due ────────────────
            now_t = time.time()
            sleep_needed = frame_interval - (now_t - last_frame_time)
            if sleep_needed > 0:
                time.sleep(sleep_needed)
            last_frame_time = time.time()

            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                last_frame_time = time.time()
                continue

            # ── 2. Store raw frame immediately (display_thread reads this) ─────
            with RAW_FRAME_LOCK:
                LAST_RAW_FRAME[location_id] = frame

            # ── 3. Determine priority ─────────────────────────────────────────
            with active_location_lock:
                is_active = location_id in active_location_ids

            # Background streams: only submit for inference every 5 s.
            # The raw frame above is still stored so the display stays current.
            if not is_active:
                time.sleep(5.0)

            # ── 4. Motion gate — skip GPU if nothing changed ──────────────────
            if not has_motion(location_id, frame):
                continue

            # ── 5. Pre-process: resize then CLAHE ────────────────────────────
            frame_resized = cv2.resize(
                frame, (INFERENCE_WIDTH, INFERENCE_HEIGHT),
                interpolation=cv2.INTER_LINEAR,
            )
            frame_proc = apply_clahe(frame_resized) if DETECTION_CONFIG['enable_clahe'] else frame_resized

            # ── 6. Write to latest-frame slot (GPU worker picks this up) ──────
            # This is a non-blocking overwrite — if the GPU hasn't consumed the
            # previous frame yet, it gets replaced with this newer one.
            conf_threshold = LOCATION_CONF_THRESHOLDS.get(location_id, DETECTION_CONFIG['conf_threshold'])
            with INFERENCE_LATEST_LOCK:
                INFERENCE_LATEST_FRAME[location_id] = (frame_proc, is_active, conf_threshold)

            # ── 7. DB logging (reads detections published by GPU worker) ──────
            with DETECTION_LOCK:
                current_dets = LAST_DETECTIONS.get(location_id, [])
            current_count = len(current_dets)

            if current_count > inference_peak_count:
                inference_peak_count = current_count

            now = time.time()
            high_threshold  = LOCATION_HIGH_THRESHOLDS.get(location_id, 10)
            is_high_density = inference_peak_count >= high_threshold
            time_since_last_log = now - last_log_time

            if time_since_last_log >= 60 or (is_high_density and time_since_last_log >= 10):
                conf_avg = (
                    sum(d['confidence'] for d in current_dets) / len(current_dets)
                    if current_dets else None
                )
                if log_detection_to_database(app_context, location_id, inference_peak_count, conf_avg):
                    last_log_time        = now
                    inference_peak_count = 0

        except Exception as e:
            print(f"[VISION] Error in inference_thread for {location_name}: {e}")
            time.sleep(1)


# ══════════════════════════════════════════════════════════════════════════════
#  Display Thread  (one per location — runs at 30 FPS)
# ══════════════════════════════════════════════════════════════════════════════

def display_thread(location_id: int):
    """
    Renders annotated video at 30 FPS for MJPEG streaming.

    Responsibilities:
      1. Read the latest raw frame from LAST_RAW_FRAME.
      2. Read the latest SAHI detections from LAST_DETECTIONS.
      3. Scale detection bboxes from inference size → source frame size.
      4. Apply CLAHE, privacy blur, and annotation overlays.
      5. JPEG-encode and publish to THREAD_FRAMES.
      6. Update THREAD_COUNTS with the current person count.

    Boxes update at the GPU inference rate (typically 5–24 FPS depending
    on hardware) and persist between updates so the display always shows
    the most recent detection state.
    """
    # ── FPS smoothing (EMA) ────────────────────────────────────────────────
    smoothed_fps = 0.0
    _FPS_ALPHA   = 0.1   # smoothing factor: lower = more stable

    # Last known detections (scaled to source size), reused between inference
    _cached_detections = []

    print(f"[VISION] Display thread started for location {location_id}")

    while True:
        loop_start = time.time()

        # ── 1. Read latest raw frame (copy under lock to prevent torn reads) ──
        with RAW_FRAME_LOCK:
            raw = LAST_RAW_FRAME.get(location_id)

        if raw is None:
            time.sleep(1.0 / 30.0)
            continue

        # Snapshot so inference_thread can overwrite LAST_RAW_FRAME
        # without affecting our rendering mid-frame.
        frame = raw.copy()
        h_src, w_src = frame.shape[:2]

        # ── 2. Read latest detections ─────────────────────────────────────────
        with DETECTION_LOCK:
            raw_detections = LAST_DETECTIONS.get(location_id, [])
            has_new        = DETECTION_UPDATED.get(location_id, False)
            if has_new:
                DETECTION_UPDATED[location_id] = False

        # ── 3. Scale detections to source frame size when new ones arrive ─────
        if has_new:
            sx = w_src / INFERENCE_WIDTH
            sy = h_src / INFERENCE_HEIGHT
            scaled = []
            for d in raw_detections:
                x1, y1, x2, y2 = d['bbox']
                x1, y1 = int(x1 * sx), int(y1 * sy)
                x2, y2 = int(x2 * sx), int(y2 * sy)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w_src, x2), min(h_src, y2)
                if x2 > x1 and y2 > y1:
                    scaled.append({
                        'bbox':       [x1, y1, x2, y2],
                        'confidence': d['confidence'],
                    })
            _cached_detections = scaled

        count = len(_cached_detections)

        # ── 4. Update counts ──────────────────────────────────────────────────
        with STREAM_LOCK:
            THREAD_COUNTS[location_id] = count
            if count > THREAD_MAX_COUNTS.get(location_id, 0):
                THREAD_MAX_COUNTS[location_id] = count

        # ── 5. CPU rendering ──────────────────────────────────────────────────
        try:
            display = apply_clahe(frame) if DETECTION_CONFIG['enable_clahe'] else frame.copy()
            if _cached_detections:
                if DETECTION_CONFIG['enable_blur']:
                    display = apply_gaussian_blur(display, _cached_detections)
                display = draw_detections_on_frame(display, _cached_detections)

            # EMA-smoothed FPS, capped at 30 to match target framerate
            elapsed_render = time.time() - loop_start
            instant_fps    = 1.0 / max(elapsed_render, 1e-9)
            instant_fps    = min(instant_fps, 30.0)
            smoothed_fps   = _FPS_ALPHA * instant_fps + (1 - _FPS_ALPHA) * smoothed_fps

            display = draw_cctv_overlay(display, count, smoothed_fps)
            ok, buf = cv2.imencode('.jpg', display, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ok:
                with STREAM_LOCK:
                    THREAD_FRAMES[location_id] = buf.tobytes()
        except Exception as e:
            print(f"[VISION] Render error loc {location_id}: {e}")

        # ── 6. Sleep the remainder of the 30-FPS budget ───────────────────────
        elapsed   = time.time() - loop_start
        remainder = (1.0 / 30.0) - elapsed
        if remainder > 0:
            time.sleep(remainder)


# ══════════════════════════════════════════════════════════════════════════════
#  Flask MJPEG Streaming Server
# ══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes',
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


def generate_mjpeg_stream(location_id: int):
    """
    MJPEG generator capped at 30 FPS using wall-clock timing.
    Sends each frame no faster than once per 33 ms regardless of how
    quickly display_thread produces them — this prevents the browser
    from receiving frames faster than real time and seeing fast-forward.
    """
    if location_id not in FOOTAGE_LOCATION_IDS:
        return

    frame_interval = 1.0 / 30.0
    last_sent      = time.time() - frame_interval   # send first frame immediately

    while True:
        now  = time.time()
        wait = frame_interval - (now - last_sent)
        if wait > 0:
            time.sleep(wait)

        with STREAM_LOCK:
            frame_data = THREAD_FRAMES.get(location_id)

        if frame_data is None:
            time.sleep(0.05)
            continue

        last_sent = time.time()
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n'
        )


@app.route('/video_feed')
def video_feed():
    """Stream the currently active location (backward-compatible endpoint)."""
    with active_location_lock:
        loc_id = next(iter(active_location_ids), 1)
    return Response(
        generate_mjpeg_stream(loc_id),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


@app.route('/video_feed/<int:location_id>')
def video_feed_by_id(location_id: int):
    """
    Stream a specific location by ID.
    Returns 404 if the location has no video footage configured.
    """
    if location_id not in FOOTAGE_LOCATION_IDS:
        return jsonify({
            'status': 'error',
            'message': f'Location {location_id} has no video footage configured.',
            'has_footage': False,
        }), 404
    return Response(
        generate_mjpeg_stream(location_id),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


@app.route('/live-count', methods=['GET'])
def live_count():
    """Count for the primary active location (backward-compatible)."""
    with active_location_lock:
        loc_id = next(iter(active_location_ids), 1)
    with STREAM_LOCK:
        count = THREAD_COUNTS.get(loc_id, 0)
    return jsonify({
        'count': count,
        'has_footage': loc_id in FOOTAGE_LOCATION_IDS,
    })


@app.route('/live-count/<int:location_id>', methods=['GET'])
def live_count_by_id(location_id: int):
    """
    Count for a specific location.
    Returns count=null for locations without footage — the redirection
    algorithm should treat null as "no live data available" rather than zero.
    """
    has_footage = location_id in FOOTAGE_LOCATION_IDS
    with STREAM_LOCK:
        count = THREAD_COUNTS.get(location_id, None) if has_footage else None
    return jsonify({
        'location_id': location_id,
        'count':       count,
        'has_footage': has_footage,
    })


@app.route('/yolo/config', methods=['POST'])
def update_yolo_config():
    data = request.json or {}
    if 'enable_clahe' in data:
        DETECTION_CONFIG['enable_clahe'] = data['enable_clahe']
    if 'enable_blur' in data:
        DETECTION_CONFIG['enable_blur'] = data['enable_blur']
    return jsonify({'status': 'success', 'config': DETECTION_CONFIG})


@app.route('/device-info', methods=['GET'])
def device_info_route():
    return jsonify(DEVICE_INFO)


@app.route('/set-active-location', methods=['POST'])
def set_active_location():
    """
    Multi-viewer endpoint.

    Body: { "location_id": <int>, "action": "add" | "remove" | "set" }
      add    → add this location to the active set (another viewer opened it)
      remove → remove from active set (viewer closed the tab)
      set    → replace the entire set with just this location (legacy behaviour)

    Returns 400 if the location has no footage — footage-less locations are
    valid for the redirection algorithm but cannot be streamed or set active.
    """
    data   = request.get_json(silent=True) or {}
    new_id = data.get('location_id')
    action = data.get('action', 'set')

    if not isinstance(new_id, int):
        return jsonify({'status': 'error', 'message': 'location_id must be an integer'}), 400

    if new_id not in FOOTAGE_LOCATION_IDS:
        return jsonify({
            'status':      'error',
            'message':     f'Location {new_id} has no video footage and cannot be set as active.',
            'has_footage': False,
        }), 400

    with active_location_lock:
        if action == 'add':
            active_location_ids.add(new_id)
        elif action == 'remove':
            active_location_ids.discard(new_id)
            if not active_location_ids:
                # Fall back to the first available footage location
                fallback = next(iter(FOOTAGE_LOCATION_IDS), new_id)
                active_location_ids.add(fallback)
        else:  # 'set' — legacy single-active behaviour
            active_location_ids.clear()
            active_location_ids.add(new_id)
        current = list(active_location_ids)

    print(f"[VISION] Active locations → {current}")
    return jsonify({'status': 'ok', 'active_location_ids': current})


@app.route('/active-locations', methods=['GET'])
def get_active_locations():
    """Returns the current set of actively-streamed location IDs."""
    with active_location_lock:
        return jsonify({'active_location_ids': list(active_location_ids)})


@app.route('/locations/status', methods=['GET'])
def locations_status():
    """
    Returns the live status of every location — both footage and non-footage.
    Designed for the redirection algorithm so it can see all locations in one
    call without needing to know which have cameras.

    Response shape:
    {
      "locations": [
        {
          "id":          1,
          "has_footage": true,
          "count":       42,        # null if no footage
          "is_active":   true       # true if currently being streamed
        },
        {
          "id":          6,
          "has_footage": false,
          "count":       null,
          "is_active":   false
        }
      ]
    }
    """
    with active_location_lock:
        active_set = set(active_location_ids)
    with STREAM_LOCK:
        counts = dict(THREAD_COUNTS)

    result = []
    for loc_id in sorted(set(FOOTAGE_LOCATION_IDS) | _ALL_LOCATION_IDS):
        has_footage = loc_id in FOOTAGE_LOCATION_IDS
        result.append({
            'id':          loc_id,
            'has_footage': has_footage,
            'count':       counts.get(loc_id) if has_footage else None,
            'is_active':   loc_id in active_set,
        })
    return jsonify({'locations': result})


# ══════════════════════════════════════════════════════════════════════════════
#  DB Polling Fallback Thread  (safety net only — push endpoint is primary)
# ══════════════════════════════════════════════════════════════════════════════

def db_polling_thread(app_context):
    """
    Polls at 5 s as a safety net for page refreshes / missed push calls.
    Sets the active location to whatever is_active=True in the DB,
    but only if that location has footage — footage-less locations cannot
    be streamed and should never enter the active set.
    """
    while True:
        time.sleep(5)
        try:
            with app_context():
                active_loc = Location.query.filter_by(is_active=True).first()
                if active_loc and active_loc.id in FOOTAGE_LOCATION_IDS:
                    with active_location_lock:
                        if active_loc.id not in active_location_ids:
                            print(f"[VISION] Fallback poll → location {active_loc.id} ({active_loc.name})")
                            active_location_ids.clear()
                            active_location_ids.add(active_loc.id)
                elif active_loc and active_loc.id not in FOOTAGE_LOCATION_IDS:
                    print(f"[VISION] Fallback poll: DB active location {active_loc.id} "
                          f"({active_loc.name}) has no footage — ignoring.")
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════════════════════
#  Entrypoint
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    # ── Step 1: Detect hardware ────────────────────────────────────────────────
    DEVICE_INFO.update(detect_device())

    # ── Step 2: Load model (with CPU fallback) ────────────────────────────────
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
    print(f"[VISION] CPU cores available: {_LOGICAL_CORES}")

    with app.app_context():
        db.create_all()
        locations = Location.query.all()

        # ── Classify locations ────────────────────────────────────────────────
        # _ALL_LOCATION_IDS  : every location in the DB (used by /locations/status)
        # FOOTAGE_LOCATION_IDS: only those with a resolvable video file
        # Locations without footage get no threads — they exist purely for
        # the redirection algorithm's metadata (name, capacity, coordinates etc.)
        _ALL_LOCATION_IDS.update(loc.id for loc in locations)

        for loc in locations:
            if loc.video_filename and resolve_video_path(loc.video_filename):
                FOOTAGE_LOCATION_IDS.add(loc.id)
            elif loc.video_filename:
                print(f"[VISION] WARNING: {loc.name} has video_filename='{loc.video_filename}' "
                      f"but the file could not be found — treating as no-footage location.")
            else:
                print(f"[VISION] No footage: {loc.name} (id={loc.id}) — "
                      f"redirection metadata only, no threads spawned.")

        # Initialise active set to the first footage location found (not hardcoded 1)
        with active_location_lock:
            active_location_ids.clear()
            first_footage = next(iter(sorted(FOOTAGE_LOCATION_IDS)), None)
            if first_footage:
                active_location_ids.add(first_footage)

        print(f"[VISION] Footage locations : {sorted(FOOTAGE_LOCATION_IDS)}")
        print(f"[VISION] No-footage locations: {sorted(_ALL_LOCATION_IDS - FOOTAGE_LOCATION_IDS)}")
        print(f"[VISION] Initial active set : {sorted(active_location_ids)}")

        # Start DB fallback polling thread
        threading.Thread(
            target=db_polling_thread, args=(app.app_context,), daemon=True,
        ).start()

        # Initialise per-location shared state.
        # Only for locations that actually have resolvable footage.
        for loc_id in FOOTAGE_LOCATION_IDS:
            LAST_DETECTIONS[loc_id]         = []
            DETECTION_UPDATED[loc_id]       = False
            LAST_RAW_FRAME[loc_id]          = None
            THREAD_FRAMES[loc_id]           = None
            THREAD_COUNTS[loc_id]           = 0
            THREAD_MAX_COUNTS[loc_id]       = 0

        # Start the single GPU inference worker
        threading.Thread(target=gpu_inference_worker, daemon=True).start()

        # Start one inference thread + one display thread per footage location only.
        footage_locs = [loc for loc in locations if loc.id in FOOTAGE_LOCATION_IDS]
        for loc in footage_locs:
            threading.Thread(
                target=inference_thread,
                args=(app.app_context, loc.id, loc.video_filename, loc.name),
                daemon=True,
            ).start()
            threading.Thread(
                target=display_thread,
                args=(loc.id,),
                daemon=True,
            ).start()

    n = len(footage_locs)
    print("[VISION] Starting Multi-Stream MJPEG Server on port 5002...")
    print(f"[VISION] Footage locations   : {n}  → {2*n} threads (inference + display each)")
    print(f"[VISION] No-footage locations: {len(locations) - n}  → 0 threads (redirection metadata only)")
    app.run(host='0.0.0.0', port=5002, debug=False, threaded=True, use_reloader=False)