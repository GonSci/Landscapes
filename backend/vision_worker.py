#!/usr/bin/env python3
"""
Vision Worker Service - Multi-Stream Architecture
Processes all locations simultaneously with intelligent frame sampling
and YOLO model sharing to prevent lag.
"""

import os
import sys
import platform
import cv2
import numpy as np
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction, get_prediction
from sahi.models.base import DetectionModel
import threading
import time
from datetime import datetime
from dotenv import load_dotenv
import math
import supervision as sv

from extensions import db
from models import Location, SurveillanceLog
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_blur': True,
    # Detection quality filters (Step 3 — Issues 2.1 + 2.3)
    'min_bbox_area': 400,         # Minimum area in pixels² (e.g., 20×20) — reject SAHI tile noise
    'min_person_ratio': 0.3,      # height/width — reject very wide shapes (vehicles, benches)
    'max_person_ratio': 6.0,      # height/width — reject very thin vertical lines (poles, columns)
}

# Per-location pipeline configuration derived from ablation study.
# Each location gets a fully independent pipeline strategy:
#   conf       — YOLO confidence threshold
#   slice_size — SAHI tile dimensions (only used when use_sahi=True)
#   use_clahe  — whether to apply CLAHE contrast enhancement before inference
#   use_sahi   — whether to use SAHI sliced prediction or direct YOLOv8
#   overlap    — SAHI tile overlap ratio (only used when use_sahi=True)
LOCATION_PIPELINE_CONFIG = {
    1: {  # Baguio Night Market — Baseline YOLOv8 Only
        'conf': 0.25,
        'slice_size': 256,      # unused (use_sahi=False), kept for reference
        'use_clahe': False,     # dark scene, CLAHE amplifies noise
        'use_sahi': False,      # ablation showed direct YOLO is better here
        'overlap': 0.15,
    },
    2: {  # Wright Park — Full Enhancement
        'conf': 0.40,
        'slice_size': 512,
        'use_clahe': True,
        'use_sahi': True,
        'overlap': 0.15,
    },
    3: {  # The Mansion — Full Enhancement
        'conf': 0.35,
        'slice_size': 384,
        'use_clahe': True,
        'use_sahi': True,
        'overlap': 0.15,
    },
    4: {  # Baguio Cathedral — Full Enhancement
        'conf': 0.45,
        'slice_size': 384,
        'use_clahe': True,
        'use_sahi': True,
        'overlap': 0.15,
    },
    5: {  # Melvin Jones Burnham Park — SAHI Only (avoid overexposure)
        'conf': 0.20,
        'slice_size': 512,
        'use_clahe': False,     # outdoor daylight, CLAHE causes overexposure
        'use_sahi': True,
        'overlap': 0.15,
    },
}

# Fallback for locations not in the table (e.g., newly added ones)
DEFAULT_PIPELINE_CONFIG = {
    'conf': 0.35,
    'slice_size': 448,
    'use_clahe': True,
    'use_sahi': True,
    'overlap': 0.15,
}

# Step 12: Moved from inside camera_thread hot loop where it was
# recreated 150×/sec (30 FPS × 5 threads).  Constants belong at module level.
LOCATION_HIGH_THRESHOLDS = {1: 15, 2: 38, 3: 14, 4: 15, 5: 66}

YOLO_MODEL = None

# ── Issue 2 Fix: GPU Inference Worker ─────────────────────────────────────────
# Replace YOLO_LOCK (which serialized 5 threads and starved 4 at a time) with a
# dedicated worker thread that is the *sole owner of the GPU*.
# Camera threads drop frames in → pick annotated results out.  No lock needed.
#
# Issue 3.1 Fix: split into two queues so the active stream always gets GPU
# priority.  The worker drains INFERENCE_ACTIVE_QUEUE first; background frames
# only run when the active queue is empty.
import queue as _queue
INFERENCE_ACTIVE_QUEUE     = _queue.Queue(maxsize=1)   # active stream gets its own dedicated slot
INFERENCE_BACKGROUND_QUEUE = _queue.Queue(maxsize=5)   # room for all background streams to queue at once
INFERENCE_OUTPUT_QUEUES    = {}                         # location_id -> Queue(maxsize=1)

# Populated by detect_device() at startup — used throughout the module
DEVICE_INFO = {
    'device': 'cpu',        # 'cuda:0' | 'cpu'
    'use_tensorrt': False,  # True only when GTX 1660 Super (or any CUDA GPU with .engine)
    'use_coreml': False,    # True only when using an Apple Silicon Chip (M1 - M5)
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

# Step 7: Multi-user support — replace single active_location_id with a dict
# of active locations, each with a heartbeat timestamp.  Locations auto-expire
# after ACTIVE_LOCATION_TIMEOUT seconds without a heartbeat.
active_locations = {}              # location_id → last_heartbeat_time (float)
active_locations_lock = threading.Lock()
ACTIVE_LOCATION_TIMEOUT = 30       # seconds — expire if no heartbeat in 30s


def detect_device():
    """
    Probe the system for hardware acceleration.
    Priority order:
      1. CUDA GPU + best.engine exists  → TensorRT on cuda:0
      2. Apple Silicon + best.mlpackage → CoreML on ANE/GPU
      3. CUDA GPU (no .engine)          → PyTorch on cuda:0
      4. Apple Silicon (no mlpackage)   → PyTorch on MPS (Metal)
      5. No acceleration                → PyTorch on CPU
    """
    info = {
        'device': 'cpu',
        'use_tensorrt': False,
        'use_coreml': False,
        'gpu_name': None,
        'backend': 'pytorch',
    }
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    # -- Check for Nvidia CUDA --
    try:
        import torch
        if torch.cuda.is_available():
            info['device'] = 'cuda:0'
            info['gpu_name'] = torch.cuda.get_device_name(0)
            print(f"[VISION] Nvidia GPU detected: {info['gpu_name']}")

            if os.path.exists(os.path.join(backend_dir, 'best.engine')):
                info['use_tensorrt'] = True
                info['backend'] = 'tensorrt'
                print("[VISION] TensorRT engine found — using TensorRT backend")
            return info
    except ImportError:
        pass

    # -- Check for Apple Silicon (M1-M5) --
    if sys.platform == 'darwin' and platform.machine() == 'arm64':
        info['gpu_name'] = 'Apple M-Series (ANE/GPU)'
        info['device'] = 'mps' # Default to Metal Performance Shaders for PyTorch
        print("[VISION] Apple Silicon detected.")

        if os.path.exists(os.path.join(backend_dir, 'best.mlpackage')):
            info['use_coreml'] = True
            info['backend'] = 'coreml'
            print("[VISION] CoreML package found — using CoreML backend")
        else:
            print("[VISION] No best.mlpackage found. Will fallback to PyTorch MPS (Metal).")
        return info

    print("[VISION] No hardware acceleration detected — running on CPU")
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

# ── CoreML SAHI Wrapper ────────────────────────────────────────────────────────
class CoreMLDetectionModel(DetectionModel):
    """
    Subclasses SAHI's DetectionModel for Apple Silicon (CoreML).
    Bypasses SAHI's default initialization which crashes on exported packages.
    """
    def __init__(self, mlpackage_path: str, conf: float):
        super().__init__(
            model_path=mlpackage_path,
            confidence_threshold=conf,
            device='cpu', # ultralytics + coremltools routes this natively to ANE
            category_mapping={0: 'person'},
            category_remapping=None,
            load_at_init=False,
            image_size=None,
        )
        self.load_model()

    def load_model(self):
        from ultralytics import YOLO as UltralyticsYOLO
        # Explicitly define task='detect' to prevent Ultralytics from guessing
        self.model = UltralyticsYOLO(self.model_path, task='detect')
        self.set_model(self.model)
        print(f"[VISION] CoreML package loaded from {self.model_path}")

    def set_model(self, model):
        self.model = model
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        self._original_predictions = self.model.predict(
            source=image,
            conf=self.confidence_threshold,
            classes=[0],
            verbose=False,
            imgsz=800,  # <--- Forces Ultralytics to feed 800px inputs to the M5
        )

    def convert_original_predictions(self, shift_amount=None, full_shape=None):
        from sahi.prediction import ObjectPrediction
        if shift_amount is None: shift_amount = [0, 0]
        
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

        self._object_prediction_list_per_image = [object_prediction_list]

def load_model(device_info: dict):
    """
    Load the appropriate model based on detected device.
    """
    conf  = DEFAULT_PIPELINE_CONFIG['conf']
    device = device_info['device']
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    if device_info['use_tensorrt']:
        # ── Path A: TensorRT (Production on GTX 1660 Super) ───────────────────
        engine_path = os.path.join(backend_dir, 'best.engine')
        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : TensorRT FP16")
        print(f"[VISION]  Model    : {engine_path}")
        print(f"[VISION]  Device   : {device}  ({device_info['gpu_name']})")
        print("[VISION] ══════════════════════════════════════════")
        return TensorRTDetectionModel(engine_path, conf=conf, device=device)

    elif device_info['use_coreml']:
        # ── Path B: CoreML (Local Development on M-Series) ────────────────────
        mlpackage_path = os.path.join(backend_dir, 'best.mlpackage')
        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : CoreML")
        print(f"[VISION]  Model    : {mlpackage_path}")
        print(f"[VISION]  Device   : {device_info['gpu_name']}")
        print("[VISION] ══════════════════════════════════════════")
        
        # Use our custom wrapper to bypass SAHI's .pt restrictions
        return CoreMLDetectionModel(mlpackage_path, conf=conf)

    else:
        # ── Path C: PyTorch via SAHI AutoDetectionModel (Fallback) ────────────
        pt_path = os.path.join(backend_dir, 'best.pt')
        sahi_device = '0' if device == 'cuda:0' else device # handles 'mps' or 'cpu'

        print("[VISION] ══════════════════════════════════════════")
        print(f"[VISION]  Backend  : PyTorch")
        print(f"[VISION]  Model    : {pt_path}")
        print(f"[VISION]  Device   : {device}")
        print("[VISION] ══════════════════════════════════════════")

        return AutoDetectionModel.from_pretrained(
            model_type='yolov8',
            model_path=pt_path,
            confidence_threshold=conf,
            device=sahi_device,
        )

# ── Inference Dispatcher ───────────────────────────────────────────────────────
def run_inference(model, frame_proc: np.ndarray, device_info: dict, loc_config: dict):
    """
    Location-aware inference dispatcher.

    Routes each frame through the correct pipeline based on the location's
    ablation-study config:

    - use_sahi=True:  SAHI sliced prediction at the location's slice_size
    - use_sahi=False: Direct YOLOv8 full-frame prediction (no slicing)

    This replaces the old run_sahi_inference() which used a hardcoded 448×448
    slice size for all locations.
    """
    if loc_config['use_sahi']:
        # SAHI sliced prediction with per-location tile size
        return get_sliced_prediction(
            frame_proc,
            model,
            slice_height=loc_config['slice_size'],
            slice_width=loc_config['slice_size'],
            overlap_height_ratio=loc_config['overlap'],
            overlap_width_ratio=loc_config['overlap'],
            postprocess_match_metric="IOU",
            postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
            postprocess_class_agnostic=True,
            verbose=False,
        )
    else:
        # Direct YOLOv8 — single full-frame pass, no slicing
        # Used for Night Market where ablation showed SAHI hurts more than helps
        return get_prediction(
            frame_proc,
            model,
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

# Issue 3 Fix: create once at module level instead of once per frame.
# cv2.createCLAHE() allocates internal state; calling it 150×/sec was pure waste.
_CLAHE = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))

def apply_clahe(frame):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    cl = _CLAHE.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def apply_gaussian_blur(frame, detections_pixel, ksize=(51, 51)):
    # Issue 8 Fix: one full-frame blur + mask composite instead of
    # N per-ROI GaussianBlur calls (N = number of detections).
    # Before: 40 people → 40 kernel dispatches, each with its own
    #         memory round-trip and adaptive kernel-size clamping.
    # After:  always 2 operations regardless of crowd size —
    #         one cv2.GaussianBlur on the full frame, one np.where composite.
    h_img, w_img = frame.shape[:2]

    # Single blur of the whole frame — one kernel dispatch regardless of N.
    blurred_full = cv2.GaussianBlur(frame, ksize, 0)

    # Build a binary mask: filled white rectangles over every detection bbox.
    mask = np.zeros((h_img, w_img), dtype=np.uint8)
    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)
        if x2 > x1 and y2 > y1:
            cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)

    # Composite: blurred pixels where mask=255, original pixels everywhere else.
    # mask3 expands (H, W) → (H, W, 1) so np.where broadcasts over all 3 BGR channels.
    mask3 = mask[:, :, np.newaxis]
    return np.where(mask3 == 255, blurred_full, frame)

def draw_detections_on_frame(frame, detections_pixel):
    annotated = frame.copy()
    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        track_id = det.get('id', 'Wait...')
    
        color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        label = f"ID: {track_id}"
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

    Issue 3.1 Fix: drains INFERENCE_ACTIVE_QUEUE first so the stream the user
    is watching always gets GPU priority.  After each active frame, also
    processes ONE background frame if available — this prevents starvation
    because the active queue is nearly always non-empty (camera thread fills
    it at 30 FPS).  Because only this thread ever touches YOLO_MODEL there
    is no lock anywhere — contention is eliminated by design.
    """
    global YOLO_MODEL
    print("[VISION] GPU inference worker started (priority queue mode)")
    while True:
        try:
            item = None

            # Priority 1: always check the active stream queue first
            try:
                item = INFERENCE_ACTIVE_QUEUE.get_nowait()
            except _queue.Empty:
                pass

            # Priority 2: if no active frame waiting, check background
            if item is None:
                try:
                    item = INFERENCE_BACKGROUND_QUEUE.get_nowait()
                except _queue.Empty:
                    pass

            # Nothing in either queue — block briefly on active to avoid busy-spin
            if item is None:
                try:
                    item = INFERENCE_ACTIVE_QUEUE.get(timeout=0.05)
                except _queue.Empty:
                    continue

            location_id, frame_proc, is_active, conf_threshold, loc_config = item
            # Apply the per-location threshold (safe -- only this thread touches YOLO_MODEL)
            YOLO_MODEL.confidence_threshold = conf_threshold
            results = run_inference(YOLO_MODEL, frame_proc, DEVICE_INFO, loc_config)
            # Non-blocking put: drain stale result first so we never block.
            # On fast backends (TensorRT ~30ms/frame) the old blocking .put()
            # would deadlock when a background output queue was full (the bg
            # camera thread only reads every 5 seconds).
            try:
                INFERENCE_OUTPUT_QUEUES[location_id].get_nowait()  # discard stale
            except _queue.Empty:
                pass
            INFERENCE_OUTPUT_QUEUES[location_id].put(results)

            # ── Anti-starvation: process ONE background frame after each active ──
            # The active queue is almost always non-empty (filled at 30 FPS), so
            # the "Priority 2" check above rarely fires.  This ensures background
            # frames get processed promptly.  Background inference runs once every
            # ~5s per location, so this adds < 7% GPU overhead.
            if is_active:
                try:
                    bg_item = INFERENCE_BACKGROUND_QUEUE.get_nowait()
                    bg_loc, bg_frame, bg_active, bg_conf, bg_cfg = bg_item
                    YOLO_MODEL.confidence_threshold = bg_conf
                    bg_results = run_inference(YOLO_MODEL, bg_frame, DEVICE_INFO, bg_cfg)
                    # Same non-blocking pattern for background output
                    try:
                        INFERENCE_OUTPUT_QUEUES[bg_loc].get_nowait()  # discard stale
                    except _queue.Empty:
                        pass
                    INFERENCE_OUTPUT_QUEUES[bg_loc].put(bg_results)
                except _queue.Empty:
                    pass

        except Exception as e:
            print(f"[VISION] gpu_inference_worker error: {e}")
            # Put a sentinel so camera_thread doesn't block forever
            try:
                INFERENCE_OUTPUT_QUEUES[location_id].put_nowait(None)
            except Exception:
                pass


# ── YOLO Pipeline ──────────────────────────────────────────────────────────────
# Step 5: Signature changed to accept pre-processed frame (frame_proc) and raw
# frame (frame_raw) separately.  CLAHE is now applied in camera_thread only when
# should_process_ai is True — saves ~60-70% of CLAHE CPU time.
def run_yolo_pipeline(frame_proc, frame_raw, location_id, tracker, last_tracked_objects, is_active=True, annotate=True):
    start_time = time.time()
    loc_config = LOCATION_PIPELINE_CONFIG.get(location_id, DEFAULT_PIPELINE_CONFIG)
    conf_threshold = loc_config['conf']
    
    # 1. Attempt to send frame to GPU (routed by priority)
    target_queue = INFERENCE_ACTIVE_QUEUE if is_active else INFERENCE_BACKGROUND_QUEUE
    try:
        target_queue.put_nowait((location_id, frame_proc, is_active, conf_threshold, loc_config))
    except _queue.Full:
        pass

    # 2. Check for fresh GPU results
    new_results = None
    try:
        new_results = INFERENCE_OUTPUT_QUEUES[location_id].get_nowait()
    except _queue.Empty:
        pass 

    h, w = frame_raw.shape[:2]
    current_tracked_objects = []

    # 3. If GPU has new data, update ByteTrack
    if new_results is not None:
        xyxy = []
        confidences = []
        
        for obj in new_results.object_prediction_list:
            if obj.category.id != 0: continue 
            
            x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
            conf = obj.score.value
            
            bw, bh = x2 - x1, y2 - y1

            # Existing: reject oversized detections
            if bw > (w * 0.6) or bh > (h * 0.6): continue
            if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2): continue

            # Step 3: Minimum area filter — reject tiny noise from SAHI tile upscaling
            if bw * bh < DETECTION_CONFIG['min_bbox_area']: continue

            # Step 3: Aspect ratio filter — reject architectural false positives
            # A standing/walking person's height:width ratio is roughly 1.5:1 to 5:1
            if bh > 0:
                hw_ratio = bh / bw  # height / width
                if hw_ratio < DETECTION_CONFIG['min_person_ratio']: continue  # too wide (benches, cars)
                if hw_ratio > DETECTION_CONFIG['max_person_ratio']: continue  # too thin (poles, columns)

            xyxy.append([x1, y1, x2, y2])
            confidences.append(conf)
            
        if xyxy:
            # Convert to Supervision format and update tracker
            detections = sv.Detections(
                xyxy=np.array(xyxy),
                confidence=np.array(confidences),
                class_id=np.zeros(len(xyxy), dtype=int)
            )
            tracked_dets = tracker.update_with_detections(detections)
            
            # The *_ absorbs the new 'data' field and any future additions by the library
            for box, _, conf, _, track_id, *_ in tracked_dets:
                current_tracked_objects.append({
                    'bbox': [int(box[0]), int(box[1]), int(box[2]), int(box[3])],
                    'confidence': float(conf),
                    'id': int(track_id)
                })

    else:
        # GPU is busy. Reuse the last tracked objects to keep the stream fast.
        current_tracked_objects = last_tracked_objects

    # 4. Apply Privacy Padding for Rendering (Runs EVERY frame)
    detections_pixel = []
    detections_pct = []
    
    for obj in current_tracked_objects:
        x1, y1, x2, y2 = obj['bbox']
        track_id = obj['id']
        
        # 5% padding so people don't step out of the blur between GPU frames
        pad_w, pad_h = int((x2 - x1) * 0.05), int((y2 - y1) * 0.05)
        px1, py1 = max(0, x1 - pad_w), max(0, y1 - pad_h)
        px2, py2 = min(w, x2 + pad_w), min(h, y2 + pad_h)
        
        detections_pixel.append({'bbox': [px1, py1, px2, py2], 'confidence': obj['confidence'], 'id': track_id})
        detections_pct.append({'bbox': [float(px1)/w, float(py1)/h, float(px2)/w, float(py2)/h], 'confidence': obj['confidence']})

    # CPU: Annotation & Blur (use frame_proc for rendering since it has CLAHE applied)
    output_frame = frame_proc
    if annotate and detections_pixel:
        if DETECTION_CONFIG['enable_blur']:
            output_frame = apply_gaussian_blur(output_frame, detections_pixel)
        output_frame = draw_detections_on_frame(output_frame, detections_pixel)

    # Return current_tracked_objects so the camera thread can hold onto them
    # 5th return: whether we got fresh GPU results (vs stale reuse)
    return output_frame, detections_pct, detections_pixel, current_tracked_objects, (new_results is not None)

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

    # Step 2: Dual trackers tuned to actual inference rates.
    # Active tracker: expects ~10-15 inference results/sec from the GPU.
    #   lost_track_buffer=15 tolerates ~1 second of occlusion at 15 FPS.
    #   track_activation_threshold=0.25 aligns with Burnham Park's conf=0.20
    #   so distant people can create new tracks instead of being silently dropped.
    tracker_active = sv.ByteTrack(
        track_activation_threshold=0.25,
        lost_track_buffer=15,
        frame_rate=15
    )
    # Background tracker: expects 1 frame every 5 seconds (0.2 FPS).
    #   frame_rate=1 tells ByteTrack that 1 "frame" ≈ 5 real seconds,
    #   so lost_track_buffer=2 means a person must be missing for ~10 seconds
    #   before the track is dropped.
    tracker_background = sv.ByteTrack(
        track_activation_threshold=0.25,
        lost_track_buffer=2,
        frame_rate=1
    )
    last_tracked_objects = []
    track_ages = {}
    last_confirmed_detections = []   # persist confirmed boxes between GPU results
    
    # Step 8: Bounding box interpolation state.
    # Stores per-track velocity (pixels/sec) estimated from consecutive GPU results.
    # When the GPU is busy, stale boxes are extrapolated forward so the privacy
    # blur follows walking people instead of lagging 1-3 frames behind.
    track_velocities = {}        # track_id → (vx1, vy1, vx2, vy2) in px/sec
    prev_gpu_positions = {}      # track_id → (x1, y1, x2, y2) from previous GPU result
    last_gpu_result_time = 0.0   # timestamp of the last fresh GPU result

    # Variables to stabilize FPS reporting and control background processing
    display_fps = 30.0 
    last_pipeline_run = 0.0
    was_active = None  # track active/inactive transitions for terminal logging

    while True:
        try:
            loop_start = time.time()

            # Determine priority — Step 7: membership check instead of equality
            with active_locations_lock:
                is_active = location_id in active_locations

            # ── Log active/inactive transitions ──
            if was_active is not None and was_active != is_active:
                if is_active:
                    # Step 9: Reset tracker state on background → active transition.
                    # Background track_ages are from a different tracker with different
                    # frame_rate assumptions.  Carrying them into active mode would
                    # require 3 *more* sightings on top of stale background ages,
                    # causing a brief "count drops to 0" dip every tab switch.
                    # Starting fresh means the first 3 active GPU results confirm
                    # detections cleanly.
                    track_ages = {}
                    last_confirmed_detections = []
                    track_velocities = {}
                    prev_gpu_positions = {}
                    last_gpu_result_time = 0.0
                    print(f"[VISION] [{location_name}] Now ACTIVE (user is viewing) — tracker state reset")
                else:
                    # Step 9: Free memory when going inactive — the background tracker
                    # will build its own state from scratch on the next 5s inference.
                    last_tracked_objects = []
                    last_confirmed_detections = []
                    track_velocities = {}
                    prev_gpu_positions = {}
                    last_gpu_result_time = 0.0
                    print(f"[VISION] [{location_name}] Now INACTIVE (background mode) — state cleared")
            was_active = is_active
                
            # THE FIX: Always target 30 FPS to drain the OpenCV buffer continuously
            target_fps = 30.0 
            
            # Wall-clock sync to skip frames and keep video playing in real-time speed
            elapsed = time.time() - playback_start_time
            target_frame = int(elapsed * fps_video)
            current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

            frames_to_skip = target_frame - current_frame
            if frames_to_skip > 0:
                skip_count = min(frames_to_skip, int(fps_video))
                for _ in range(skip_count):
                    cap.grab()

            ret, frame = cap.read()
            
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                playback_start_time = time.time()
                last_log_time = time.time() - 61

                tracker_active = sv.ByteTrack(
                    track_activation_threshold=0.25, lost_track_buffer=15, frame_rate=15
                )
                tracker_background = sv.ByteTrack(
                    track_activation_threshold=0.25, lost_track_buffer=2, frame_rate=1
                )
                last_tracked_objects = []
                track_ages = {}
                last_confirmed_detections = []
                track_velocities = {}
                prev_gpu_positions = {}
                last_gpu_result_time = 0.0
                continue

            # THE FIX: Decide whether to run the heavy AI math.
            now = time.time()
            should_process_ai = is_active or (now - last_pipeline_run >= 5.0)

            with STREAM_LOCK:
                current_count = THREAD_COUNTS.get(location_id, 0)

            # Step 6: Eliminate unconditional frame.copy().
            # Before: output_frame = frame.copy() ran EVERY iteration (30 FPS × 5 threads
            # = ~255 MB/sec of wasted memcpy).  Now:
            #   - Background + no AI → skip rendering entirely
            #   - Active + no AI → render CCTV overlay on raw frame for smooth video
            #   - AI ran → use pipe_frame directly (pipeline already has its own frame)

            if not should_process_ai and not is_active:
                # Background idle tick — nothing to render or encode.
                pass  # fall through to sleep/FPS logic below
            elif not should_process_ai and is_active:
                # Active stream but GPU hasn't produced new results this tick.
                # Still need to encode a fresh frame so the MJPEG stream isn't frozen.
                # Use the raw camera frame with just the CCTV overlay — no AI processing.
                output_frame = frame.copy()
                output_frame = draw_cctv_overlay(output_frame, current_count, display_fps)

                # Apply last known detections for blur/boxes continuity
                if last_confirmed_detections:
                    # Step 8: Interpolate bounding boxes for smooth tracking
                    render_dets = last_confirmed_detections
                    if last_gpu_result_time > 0:
                        dt = min(time.time() - last_gpu_result_time, 0.5)
                        if dt > 0.01:
                            h_frame, w_frame = frame.shape[:2]
                            interpolated = []
                            for det in render_dets:
                                tid = det['id']
                                if tid in track_velocities:
                                    vel = track_velocities[tid]
                                    bx1 = max(0, det['bbox'][0] + int(vel[0] * dt))
                                    by1 = max(0, det['bbox'][1] + int(vel[1] * dt))
                                    bx2 = min(w_frame, det['bbox'][2] + int(vel[2] * dt))
                                    by2 = min(h_frame, det['bbox'][3] + int(vel[3] * dt))
                                    if bx2 > bx1 and by2 > by1:
                                        interpolated.append({**det, 'bbox': [bx1, by1, bx2, by2]})
                                    else:
                                        interpolated.append(det)
                                else:
                                    interpolated.append(det)
                            render_dets = interpolated

                    if DETECTION_CONFIG['enable_blur'] and render_dets:
                        output_frame = apply_gaussian_blur(output_frame, render_dets)
                    if render_dets:
                        output_frame = draw_detections_on_frame(output_frame, render_dets)

                ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret:
                    with STREAM_LOCK:
                        THREAD_FRAMES[location_id] = buffer.tobytes()
            else:
                # should_process_ai is True — run the full AI pipeline
                # Step 5: CLAHE moved here from inside run_yolo_pipeline().
                # Previously CLAHE ran at 30 FPS per thread (150 calls/sec total),
                # but only ~10-15 active frames/sec actually reach the GPU.
                # Now it only runs when we'll actually use the result for inference.
                loc_config = LOCATION_PIPELINE_CONFIG.get(location_id, DEFAULT_PIPELINE_CONFIG)
                if loc_config['use_clahe']:
                    frame_proc = apply_clahe(frame)
                else:
                    frame_proc = frame

                # 3. PIPELINE CALL — use the tracker tuned for this stream's rate
                tracker = tracker_active if is_active else tracker_background
                pipe_frame, detections_pct, detections_pixel, last_tracked_objects, got_fresh = run_yolo_pipeline(
                    frame_proc, frame, location_id, tracker, last_tracked_objects, is_active=is_active, annotate=False
                )

                # --- 4. TEMPORAL FILTERING LOGIC ---
                # ONLY run when we got fresh GPU results.  Between GPU results the
                # pipeline returns stale last_tracked_objects — incrementing ages on
                # those would cause boxes to briefly disappear every time ByteTrack
                # reassigns IDs on a fresh result.
                if got_fresh:
                    confirmed_detections = []
                    current_ids = set()

                    # Step 4: Unified temporal filtering for both active and background.
                    min_age = 3 if is_active else 2

                    for det in detections_pixel:
                        tid = det['id']
                        current_ids.add(tid)
                        track_ages[tid] = track_ages.get(tid, 0) + 1

                        if track_ages[tid] >= min_age:
                            confirmed_detections.append(det)

                    # Prune dead tracks (same for both modes)
                    track_ages = {tid: age for tid, age in track_ages.items() if tid in current_ids}

                    # Step 8: Compute per-track velocity from consecutive GPU results.
                    # Velocity = (current_pos - prev_pos) / dt, stored as px/sec.
                    now_gpu = time.time()
                    if last_gpu_result_time > 0:
                        dt_gpu = now_gpu - last_gpu_result_time
                        if 0 < dt_gpu < 2.0:  # ignore gaps > 2s (video loop, tab switch)
                            for det in confirmed_detections:
                                tid = det['id']
                                bbox = det['bbox']
                                if tid in prev_gpu_positions:
                                    prev = prev_gpu_positions[tid]
                                    track_velocities[tid] = (
                                        (bbox[0] - prev[0]) / dt_gpu,
                                        (bbox[1] - prev[1]) / dt_gpu,
                                        (bbox[2] - prev[2]) / dt_gpu,
                                        (bbox[3] - prev[3]) / dt_gpu,
                                    )

                    # Snapshot current positions for next velocity computation
                    prev_gpu_positions = {det['id']: det['bbox'] for det in confirmed_detections}
                    track_velocities = {tid: v for tid, v in track_velocities.items() if tid in current_ids}
                    last_gpu_result_time = now_gpu

                    current_count = len(confirmed_detections)
                    last_confirmed_detections = confirmed_detections
                else:
                    # No fresh GPU data — reuse last confirmed set.
                    # Step 8: On the active stream, interpolate bounding boxes forward
                    # using velocity estimates so the privacy blur follows walking people
                    # instead of lagging 1-3 frames behind.
                    confirmed_detections = last_confirmed_detections

                    if is_active and confirmed_detections and last_gpu_result_time > 0:
                        dt = min(time.time() - last_gpu_result_time, 0.5)  # cap at 500ms
                        if dt > 0.01:  # only interpolate if enough time has passed
                            h_frame, w_frame = frame.shape[:2]
                            interpolated = []
                            for det in confirmed_detections:
                                tid = det['id']
                                if tid in track_velocities:
                                    vel = track_velocities[tid]
                                    bx1 = max(0, det['bbox'][0] + int(vel[0] * dt))
                                    by1 = max(0, det['bbox'][1] + int(vel[1] * dt))
                                    bx2 = min(w_frame, det['bbox'][2] + int(vel[2] * dt))
                                    by2 = min(h_frame, det['bbox'][3] + int(vel[3] * dt))
                                    # Sanity: box must still have positive area
                                    if bx2 > bx1 and by2 > by1:
                                        interpolated.append({**det, 'bbox': [bx1, by1, bx2, by2]})
                                    else:
                                        interpolated.append(det)
                                else:
                                    interpolated.append(det)
                            confirmed_detections = interpolated

                    current_count = len(confirmed_detections)

                # Build output_frame: use pipe_frame directly (no copy needed)
                output_frame = pipe_frame
                if DETECTION_CONFIG['enable_blur'] and confirmed_detections:
                    output_frame = apply_gaussian_blur(output_frame, confirmed_detections)
                if confirmed_detections:
                    output_frame = draw_detections_on_frame(output_frame, confirmed_detections)
                
                last_pipeline_run = now

                # --- CCTV overlay + JPEG encode (only when we have something to render) ---
                output_frame = draw_cctv_overlay(output_frame, current_count, display_fps)

                # Encode: active always, background only when AI ran
                should_encode = is_active or should_process_ai
                if should_encode:
                    ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    if ret:
                        with STREAM_LOCK:
                            THREAD_FRAMES[location_id] = buffer.tobytes()

            # Update counting metrics only when AI ran
            if should_process_ai:
                with STREAM_LOCK:
                    THREAD_COUNTS[location_id] = current_count
                    if current_count > THREAD_MAX_COUNTS[location_id]:
                        THREAD_MAX_COUNTS[location_id] = current_count

            # Database Logging (Runs every loop to ensure time accuracy)
            time_since_last_log = time.time() - last_log_time
            with STREAM_LOCK:
                peak_count = THREAD_MAX_COUNTS.get(location_id, 0)

            high_threshold = LOCATION_HIGH_THRESHOLDS.get(location_id, 10)
            is_high_density = peak_count >= high_threshold

            if time_since_last_log >= 60 or (is_high_density and time_since_last_log >= 10):
                with STREAM_LOCK:
                    THREAD_MAX_COUNTS[location_id] = 0
                
                # Use empty list if no detections yet to avoid breaking DB log
                conf_avg = 1.0 # Background tasks log default confidence if no fresh data
                if 'detections_pct' in locals() and detections_pct:
                    conf_avg = sum(d['confidence'] for d in detections_pct) / len(detections_pct)
                    
                if log_detection_to_database(app_context, location_id, peak_count, conf_avg):
                    last_log_time = time.time()

            # THE FIX: Strict Sleep Lock to 30 FPS
            elapsed_this_loop = time.time() - loop_start
            remainder = (1.0 / target_fps) - elapsed_this_loop
            if remainder > 0:
                time.sleep(remainder)

            # THE FIX: Calculate actual Wall-Clock FPS after the sleep
            final_loop_time = time.time() - loop_start
            true_fps = 1.0 / final_loop_time if final_loop_time > 0 else 30.0
            # Smooth the FPS slightly so the UI number doesn't flicker wildly
            display_fps = (display_fps * 0.9) + (true_fps * 0.1)
            
        except Exception as e:
            print(f"[VISION] Error in thread for {location_name}: {e}")
            time.sleep(1)

# ── Mini Flask Streaming Server ───────────────────────────────────────────────
def generate_mjpeg_stream(location_id):
    """Step 7: Each viewer requests their specific location's stream."""
    while True:
        with STREAM_LOCK:
            frame_data = THREAD_FRAMES.get(location_id)
            
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
    """Step 7: Accept location_id query param so each viewer gets their stream."""
    loc_id = request.args.get('location_id', type=int)
    if loc_id is None:
        # Fallback: use the first active location, or location 1
        with active_locations_lock:
            loc_id = next(iter(active_locations), 1)
    return Response(generate_mjpeg_stream(loc_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/live-count', methods=['GET'])
def live_count():
    """Step 7: Accept location_id query param."""
    loc_id = request.args.get('location_id', type=int)
    if loc_id is None:
        with active_locations_lock:
            loc_id = next(iter(active_locations), 1)
    with STREAM_LOCK:
        count = THREAD_COUNTS.get(loc_id, 0)
    return jsonify({'count': count, 'location_id': loc_id})

@app.route('/yolo/config', methods=['POST'])
def update_yolo_config():
    data = request.json
    if 'enable_blur' in data: DETECTION_CONFIG['enable_blur'] = data['enable_blur']
    return jsonify({'status': 'success', 'config': DETECTION_CONFIG})

@app.route('/device-info', methods=['GET'])
def device_info_route():
    """Expose what backend/device is currently running — useful for debugging."""
    return jsonify(DEVICE_INFO)

@app.route('/set-active-location', methods=['POST'])
def set_active_location():
    """
    Step 7: Register a heartbeat for a location.  Multiple locations can be
    active simultaneously — each viewer POSTs their location_id periodically.
    Stale entries (no heartbeat in ACTIVE_LOCATION_TIMEOUT seconds) are
    auto-expired.

    Expected JSON body:  { "location_id": <int> }
    Returns:             { "status": "ok", "active_locations": [<int>, ...] }
    """
    data = request.get_json(silent=True) or {}
    new_id = data.get('location_id')

    if not isinstance(new_id, int):
        return jsonify({'status': 'error', 'message': 'location_id must be an integer'}), 400

    with active_locations_lock:
        was_present = new_id in active_locations
        active_locations[new_id] = time.time()

        # Expire stale entries
        now = time.time()
        expired = [lid for lid, ts in active_locations.items() if now - ts > ACTIVE_LOCATION_TIMEOUT]
        for lid in expired:
            del active_locations[lid]

        if not was_present:
            print(f"[VISION] Heartbeat: location {new_id} now ACTIVE (total active: {len(active_locations)})")

    return jsonify({'status': 'ok', 'active_locations': list(active_locations.keys())})


@app.route('/deactivate-location', methods=['POST'])
def deactivate_location():
    """
    Step 7: Explicitly deactivate a location when the user navigates away.
    This is faster than waiting for the 30s heartbeat timeout.
    """
    data = request.get_json(silent=True) or {}
    loc_id = data.get('location_id')

    if not isinstance(loc_id, int):
        return jsonify({'status': 'error', 'message': 'location_id must be an integer'}), 400

    with active_locations_lock:
        if loc_id in active_locations:
            del active_locations[loc_id]
            print(f"[VISION] Location {loc_id} explicitly deactivated (remaining active: {len(active_locations)})")

    return jsonify({'status': 'ok', 'active_locations': list(active_locations.keys())})


def db_polling_thread(app_context):
    """
    Step 7: Fallback poll syncs DB is_active flags into the active_locations
    heartbeat dict.  Runs every 10s as a safety net.
    """
    while True:
        time.sleep(10)
        try:
            with app_context():
                active_locs = Location.query.filter_by(is_active=True).all()
                if active_locs:
                    with active_locations_lock:
                        now = time.time()
                        for loc in active_locs:
                            if loc.id not in active_locations:
                                active_locations[loc.id] = now
                                print(f"[VISION] Fallback poll: added location {loc.id} ({loc.name})")
        except Exception:
            pass

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

        # Step 7: Seed active_locations from DB so streams are active immediately
        # at boot (no frozen video while waiting for the first frontend heartbeat).
        now = time.time()
        for loc in locations:
            if loc.is_active:
                active_locations[loc.id] = now
        if not active_locations and locations:
            # Fallback: if no location is marked active in DB, default to the first one
            active_locations[locations[0].id] = now
        print(f"[VISION] Seeded active locations: {list(active_locations.keys())}")
        
        # Issue 2 Fix: create per-location output queues, then start the single GPU worker
        for loc in locations:
            if loc.video_filename:
                INFERENCE_OUTPUT_QUEUES[loc.id] = _queue.Queue(maxsize=1)
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