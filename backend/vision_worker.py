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
YOLO_LOCK = threading.Lock()

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

    # Date at bottom right
    date_size = cv2.getTextSize(timestamp, font, 0.6, 2)[0]
    cv2.putText(frame, timestamp, (w - date_size[0] - 10, h - 10), font, 0.6, (255, 255, 255), 2)

    return frame

# ── YOLO Pipeline ──────────────────────────────────────────────────────────────
def run_yolo_pipeline(frame, annotate=True):
    global YOLO_MODEL
    start_time = time.time()

    frame_proc = apply_clahe(frame) if DETECTION_CONFIG['enable_clahe'] else frame.copy()

    # Thread-safe SAHI Inference
    with YOLO_LOCK:
        YOLO_MODEL.confidence_threshold = DETECTION_CONFIG['conf_threshold']
        results = get_sliced_prediction(
            frame_proc,
            YOLO_MODEL,
            slice_height=640,
            slice_width=640,
            overlap_height_ratio=0.15,
            overlap_width_ratio=0.15,
            postprocess_match_metric="IOU",
            postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
            postprocess_class_agnostic=True,
            verbose=False
        )

    h, w = frame.shape[:2]
    detections_pixel = []
    detections_pct = []

    for obj in results.object_prediction_list:
        if obj.category.id != 0: continue # Only class 0 (person)
        
        x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
        conf = obj.score.value

        bw, bh = x2 - x1, y2 - y1
        if bw > (w * 0.6) or bh > (h * 0.6): continue
        if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2): continue

        detections_pixel.append({'bbox': [int(x1), int(y1), int(x2), int(y2)], 'confidence': conf})
        detections_pct.append({
            'bbox': [float(x1)/w, float(y1)/h, float(x2)/w, float(y2)/h],
            'confidence': conf
        })

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

            # 2. Process frame
            output_frame, detections_pct, detections_pixel, fps = run_yolo_pipeline(frame, annotate=True)
            
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
    print("[VISION] Loading SAHI YOLOv8 model...")
    YOLO_MODEL = AutoDetectionModel.from_pretrained(
        model_type='yolov8',
        model_path='best.pt',
        confidence_threshold=DETECTION_CONFIG['conf_threshold'],
        device="cpu"
    )
    
    with app.app_context():
        db.create_all()
        locations = Location.query.all()
        
        # Start DB Polling Thread
        threading.Thread(target=db_polling_thread, args=(app.app_context,), daemon=True).start()
        
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
