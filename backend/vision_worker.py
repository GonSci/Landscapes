#!/usr/bin/env python3
"""
Vision Worker Service - Handles YOLOv8 detection and writes to PostgreSQL
This service runs independently and continuously processes video frames,
storing detection results in the SurveillanceLog table.
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
import threading
import time
from datetime import datetime
from dotenv import load_dotenv
import math

from extensions import db
from models import Location, SurveillanceLog

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'conf_threshold': 0.5,
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_clahe': True,
    'enable_blur': True,
}

VIDEO_PATH = None
YOLO_MODEL = None
PROCESSING_LOCK = threading.Lock()

# Peak-preserving count for database logging (Jacob's Method)
max_count_in_interval = 0
max_count_lock = threading.Lock()

# Track last log time per location to avoid spamming
last_log_time_per_location = {}
last_log_time_lock = threading.Lock()

active_location_id = None
active_location_lock = threading.Lock()


# ── Path Helpers ───────────────────────────────────────────────────────────────
def resolve_video_path(video_name):
    """Resolve video path across project layouts."""
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
    """Improve detection in foggy/poorly-lit scenes."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


def apply_gaussian_blur(frame, detections_pixel, ksize=(51, 51)):
    """Blur detected person regions for privacy protection."""
    blurred = frame.copy()
    h_img, w_img = frame.shape[:2]

    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w_img, x2)
        y2 = min(h_img, y2)

        roi = blurred[y1:y2, x1:x2]
        if roi.size == 0:
            continue

        roi_h, roi_w = roi.shape[:2]
        kw = min(ksize[0], roi_w) | 1
        kh = min(ksize[1], roi_h) | 1
        kw = max(3, kw)
        kh = max(3, kh)

        blurred[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (kw, kh), 0)

    return blurred


def draw_detections_on_frame(frame, detections_pixel):
    """Draw bounding boxes on frame."""
    annotated = frame.copy()

    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        confidence = det['confidence']
        track_id = det.get('track_id')

        color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        if track_id is not None:
            label = f"Person #{track_id}"
        else:
            label = f"Person {confidence:.2f}"
        
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_y = max(y1, label_size[1] + 10)

        cv2.rectangle(
            annotated,
            (x1, label_y - label_size[1] - 10),
            (x1 + label_size[0], label_y + 5),
            color, -1
        )
        cv2.putText(annotated, label, (x1, label_y - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

    return annotated


def draw_cctv_overlay(frame, people_count, fps):
    """CCTV-style overlay with timestamp, count, and FPS."""
    overlay = frame.copy()
    h, w = frame.shape[:2]

    cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
    frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    font = cv2.FONT_HERSHEY_SIMPLEX

    cv2.putText(frame, f"CCTV - {timestamp}", (10, 30),
                font, 0.6, (255, 255, 255), 2)

    count_text = f"PEOPLE: {people_count}"
    count_size = cv2.getTextSize(count_text, font, 0.8, 2)[0]
    count_x = (w - count_size[0]) // 2
    cv2.putText(frame, count_text, (count_x, 30),
                font, 0.8, (0, 255, 0), 2)

    fps_text = f"FPS: {fps:.1f}"
    fps_size = cv2.getTextSize(fps_text, font, 0.6, 2)[0]
    fps_x = w - fps_size[0] - 10
    cv2.putText(frame, fps_text, (fps_x, 30),
                font, 0.6, (0, 255, 255), 2)

    features = []
    if DETECTION_CONFIG['enable_clahe']:
        features.append("CLAHE")
    if DETECTION_CONFIG['enable_blur']:
        features.append("BLUR")
    if features:
        cv2.putText(frame, f"[{'+'.join(features)}]", (10, h - 15),
                    font, 0.45, (0, 255, 255), 1)

    config_info = f"Conf: {DETECTION_CONFIG['conf_threshold']} | IoU: {DETECTION_CONFIG['iou_threshold']}"
    cv2.putText(frame, config_info, (10, 60),
                font, 0.4, (200, 200, 200), 1)

    return frame


# ── YOLO Pipeline ──────────────────────────────────────────────────────────────
def run_yolo_pipeline(frame, annotate=True, show_overlay=True, use_tracking=False):
    """
    Full YOLO detection pipeline:
    1. CLAHE enhancement
    2. YOLO detection/tracking
    3. Gaussian blur (privacy)
    4. Draw bounding boxes
    5. Draw CCTV overlay
    
    Returns (output_frame, detections_pct, detections_pixel, fps)
    """
    global YOLO_MODEL, max_count_in_interval

    start_time = time.time()

    # Step 1 - CLAHE
    if DETECTION_CONFIG['enable_clahe']:
        frame_proc = apply_clahe(frame)
    else:
        frame_proc = frame.copy()

    # Step 2 - YOLO detection/tracking
    if use_tracking:
        results = YOLO_MODEL.track(
            frame_proc,
            classes=[0],
            conf=DETECTION_CONFIG['conf_threshold'],
            iou=DETECTION_CONFIG['iou_threshold'],
            persist=True,
            tracker="bytetrack.yaml",
            verbose=False
        )
    else:
        results = YOLO_MODEL(
            frame_proc,
            classes=[0],
            conf=DETECTION_CONFIG['conf_threshold'],
            iou=DETECTION_CONFIG['iou_threshold'],
            verbose=False
        )

    h, w = frame.shape[:2]
    detections_pixel = []
    detections_pct = []

    for result in results:
        for i, box in enumerate(result.boxes):
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])

            track_id = None
            if use_tracking and box.id is not None:
                track_id = int(box.id[0])

            # Geometric sanity checks
            bw, bh = x2 - x1, y2 - y1
            
            # Discard if box > 60% of width or height
            if bw > (w * 0.6) or bh > (h * 0.6):
                continue
            
            # Discard if box touches all 4 boundaries
            if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
                continue

            detections_pixel.append({
                'bbox': (int(x1), int(y1), int(x2), int(y2)),
                'confidence': conf,
                'track_id': track_id
            })
            detections_pct.append({
                'x': float(x1 / w * 100),
                'y': float(y1 / h * 100),
                'width': float(bw / w * 100),
                'height': float(bh / h * 100),
                'confidence': conf,
                'track_id': track_id
            })

    # Step 3 - Gaussian blur (privacy)
    if DETECTION_CONFIG['enable_blur'] and detections_pixel:
        frame_proc = apply_gaussian_blur(frame_proc, detections_pixel)

    # Step 4 - Draw bounding boxes
    output_frame = frame_proc
    if annotate:
        output_frame = draw_detections_on_frame(frame_proc, detections_pixel)

    # Step 5 - Update peak count
    current_count = len(detections_pixel)
    with max_count_lock:
        if current_count > max_count_in_interval:
            max_count_in_interval = current_count

    # Step 6 - CCTV overlay
    elapsed = time.time() - start_time
    fps = 1.0 / elapsed if elapsed > 0 else 0

    if show_overlay:
        output_frame = draw_cctv_overlay(output_frame, current_count, fps)

    return output_frame, detections_pct, detections_pixel, fps


# ── Model Initialization ───────────────────────────────────────────────────────
def initialize_yolo():
    """Initialize YOLOv8 model."""
    global YOLO_MODEL
    try:
        print("[VISION] Loading YOLOv8 model...")
        YOLO_MODEL = YOLO('best.pt')
        if DETECTION_CONFIG['use_gpu'] and cv2.cuda.getCudaEnabledDeviceCount() > 0:
            print("[VISION] ✓ GPU detected, using CUDA acceleration")
        else:
            print("[VISION] ✓ Using CPU for inference")
        print("[VISION] YOLOv8 model loaded successfully!")
        return True
    except Exception as e:
        print(f"[VISION] Error loading YOLOv8 model: {str(e)}")
        return False


# ── Database Logging ───────────────────────────────────────────────────────────
def log_detection_to_database(location_id, people_count, confidence_avg):
    """
    Insert detection result into SurveillanceLog table.
    Uses connection pooling from extensions.py.
    """
    try:
        location = Location.query.get(location_id)
        if not location:
            print(f"[VISION] Location {location_id} not found in database")
            return False

        # Confidence check - only log if reasonably confident or if count is 0
        if confidence_avg is not None and confidence_avg < 0.4 and people_count > 0:
            print(f"[VISION] Skipping log for {location.name}: Low confidence ({confidence_avg:.2f})")
            return False

        log_entry = SurveillanceLog(
            people_count=people_count,
            location_id=location_id,
            location_name=location.name,
            confidence_avg=confidence_avg
        )
        db.session.add(log_entry)
        db.session.commit()
        print(f"[VISION] Logged {people_count} people for {location.name}")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[VISION] Database error: {e}")
        return False


# ── Vision Processing Loop ────────────────────────────────────────────────────
def vision_processing_loop():
    """
    Main loop: continuously process frames and log to database.
    This runs independently and writes detection results to SurveillanceLog.
    """
    global VIDEO_PATH, YOLO_MODEL, max_count_in_interval, active_location_id

    if not initialize_yolo():
        print("[VISION] Failed to initialize YOLO model. Exiting.")
        return

    if not VIDEO_PATH or not os.path.exists(VIDEO_PATH):
        print(f"[VISION] Video file not found: {VIDEO_PATH}")
        return

    print(f"[VISION] Starting vision processing loop for: {VIDEO_PATH}")

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"[VISION] Failed to open video: {VIDEO_PATH}")
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_video = cap.get(cv2.CAP_PROP_FPS) or 30
    
    print(f"[VISION] Video info: {total_frames} frames @ {fps_video} FPS")

    frame_count = 0
    playback_start_time = time.time()

    while True:
        try:
            # Wall-clock synchronization
            elapsed = time.time() - playback_start_time
            target_frame = int(elapsed * fps_video)
            current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

            # Skip frames if behind real-time (max 3 frames to maintain tracking)
            frames_to_skip = target_frame - current_frame
            if frames_to_skip > 0:
                skip_count = min(frames_to_skip, 3)
                for _ in range(skip_count):
                    cap.grab()

            # Read frame
            ret, frame = cap.read()
            if not ret:
                # Loop video
                print("[VISION] End of video, looping...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                playback_start_time = time.time()
                continue

            # Process frame
            output_frame, detections_pct, detections_pixel, fps = run_yolo_pipeline(
                frame, annotate=True, show_overlay=True, use_tracking=True
            )

            # Log to database periodically or on high density
            with active_location_lock:
                current_loc_id = active_location_id

            if current_loc_id is not None:
                now = time.time()
                
                with max_count_lock:
                    peak_count = max_count_in_interval

                with last_log_time_lock:
                    last_log_time = last_log_time_per_location.get(current_loc_id, now - 61)

                # Dynamic thresholds per location
                location_high_thresholds = {
                    1: 15,  # Baguio Night Market
                    2: 38,  # The Mansion
                    3: 14,  # The Mansion Entrance
                    4: 15,  # Baguio Cathedral
                    5: 66   # Melvin Jones Burnham Park
                }
                high_threshold = location_high_thresholds.get(current_loc_id, 10)
                is_high_density = peak_count >= high_threshold

                time_since_last_log = now - last_log_time

                # Log if 60s passed OR high density AND 10s passed
                if time_since_last_log >= 60 or (is_high_density and time_since_last_log >= 10):
                    conf_avg = None
                    if detections_pct:
                        conf_avg = sum(d['confidence'] for d in detections_pct) / len(detections_pct)

                    if log_detection_to_database(current_loc_id, peak_count, conf_avg):
                        with last_log_time_lock:
                            last_log_time_per_location[current_loc_id] = now
                        with max_count_lock:
                            max_count_in_interval = 0

            frame_count += 1

        except Exception as e:
            print(f"[VISION] Error in processing loop: {e}")
            time.sleep(1)
            continue


# ── Initialization and Startup ─────────────────────────────────────────────────
def initialize_vision_worker(video_name='demo_video.mp4', location_id=None):
    """
    Initialize the vision worker with a video file.
    
    Args:
        video_name: Name of video file to process
        location_id: Location ID to associate with detections
    """
    global VIDEO_PATH, active_location_id

    # Resolve video path
    resolved = resolve_video_path(video_name)
    if resolved:
        VIDEO_PATH = resolved
    else:
        print(f"[VISION] Could not resolve video: {video_name}")
        return False

    # Set active location
    if location_id:
        with active_location_lock:
            active_location_id = location_id
        print(f"[VISION] Active location set to ID: {location_id}")

    print(f"[VISION] Vision worker initialized with video: {VIDEO_PATH}")
    return True


# ── Entry Point ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    from extensions import db
    from flask import Flask
    
    # Create Flask app context for database access
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Initialize with demo video and location 1 (Baguio Night Market)
        if initialize_vision_worker('demo_video.mp4', location_id=1):
            print("[VISION] Starting vision processing loop...")
            vision_processing_loop()
        else:
            print("[VISION] Failed to initialize vision worker")
