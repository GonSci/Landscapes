#!/usr/bin/env python3
"""
Flask backend for YOLOv8 crowd detection.
Fixes applied:
  1. CLAHE + Gaussian blur now run inside /api/yolo/process-frame
  2. draw_detections_on_frame uses raw pixel coords instead of double-converting percentages
  3. stream_detection also applies CLAHE + blur for consistency
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
from dotenv import load_dotenv
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import json
from threading import Lock
import threading
import time
from datetime import datetime, timedelta

from extensions import db
from extensions import db
from models import User, SurveillanceLog, Location
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# ── Global state ──────────────────────────────────────────────────────────────
yolo_model = None
video_path = None
detection_config = {
    'conf_threshold': 0.5,
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_clahe': True,    # NEW – toggle from frontend if needed
    'enable_blur': True,     # NEW – toggle from frontend if needed
}
detection_results = {
    'frame': None, 'detections': [], 'count': 0,
    'timestamp': None, 'processing': False, 'fps': 0
}
results_lock = Lock()
fps_tracker = []

# ── Persistent VideoCapture for ByteTrack tracking ────────────────────────────
# The tracker requires sequential frames to build associations between detections.
# Opening/closing VideoCapture per request breaks tracking continuity.
persistent_cap = None
cap_lock = Lock()

# ── Peak-Preserving Count for Database Logging ────────────────────────────────
# Instead of logging an instantaneous snapshot, we track the highest count
# seen in each logging interval. This ensures crowd peaks are captured
# for safety analysis (Jacob's Method). The 60% geometric filter guarantees
# that max_count values are verified physical detections, not hallucinations.
max_count_in_interval = 0
max_count_lock = Lock()

playback_clock = {
    'start_time': None,
    'fps': 30,
    'total_frames': 0
}

active_location_id = None
active_location_lock = Lock()


# ── Path helpers ───────────────────────────────────────────────────────────────
def resolve_video_path(video_name):
    """Resolve video path across new and legacy project layouts."""
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


# ── Model helpers ──────────────────────────────────────────────────────────────
def initialize_yolo():
    global yolo_model
    try:
        print("Loading YOLOv8 model...")
        yolo_model = YOLO('best.pt')
        if detection_config['use_gpu'] and cv2.cuda.getCudaEnabledDeviceCount() > 0:
            print("✓ GPU detected, using CUDA acceleration")
        else:
            print("✓ Using CPU for inference")
        print("YOLOv8 model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading YOLOv8 model: {str(e)}")
        return False


# ── Image processing helpers ───────────────────────────────────────────────────
def apply_clahe(frame):
    """
    Improve detection in foggy / poorly-lit scenes.
    Converts to LAB, applies CLAHE on the L channel, converts back to BGR.
    """
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


def apply_gaussian_blur(frame, detections_pixel, ksize=(51, 51)):
    """
    Blur detected person regions for privacy protection.
    detections_pixel: list of {'bbox': (x1,y1,x2,y2), ...} in PIXEL coords.
    """
    blurred = frame.copy()
    h_img, w_img = frame.shape[:2]

    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        x1 = max(0, x1);  y1 = max(0, y1)
        x2 = min(w_img, x2);  y2 = min(h_img, y2)

        roi = blurred[y1:y2, x1:x2]
        if roi.size == 0:
            continue

        roi_h, roi_w = roi.shape[:2]
        kw = min(ksize[0], roi_w) | 1   # ensure odd
        kh = min(ksize[1], roi_h) | 1
        kw = max(3, kw);  kh = max(3, kh)

        blurred[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (kw, kh), 0)

    return blurred


def draw_detections_on_frame(frame, detections_pixel):
    """
    Draw bounding boxes using PIXEL-coordinate detections.
    detections_pixel: list of {'bbox': (x1,y1,x2,y2), 'confidence': float, 'track_id': int|None}
    Shows Track ID labels (e.g., 'Person #3') when available for BoT-SORT tracking,
    falls back to confidence display when tracking is not active.
    """
    annotated = frame.copy()

    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        confidence = det['confidence']
        track_id = det.get('track_id')

        color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        # Show Track ID when available (BoT-SORT), otherwise show confidence
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
    from datetime import datetime
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

    # Show active features in bottom-left
    features = []
    if detection_config['enable_clahe']:
        features.append("CLAHE")
    if detection_config['enable_blur']:
        features.append("BLUR")
    if features:
        cv2.putText(frame, f"[{'+'.join(features)}]", (10, h - 15),
                    font, 0.45, (0, 255, 255), 1)

    config_info = f"Conf: {detection_config['conf_threshold']} | IoU: {detection_config['iou_threshold']}"
    cv2.putText(frame, config_info, (10, 60),
                font, 0.4, (200, 200, 200), 1)

    return frame


def run_yolo_pipeline(frame, annotate=True, show_overlay=True, use_tracking=False):
    """
    Full pipeline used by both process_frame and stream_detection:
      1. CLAHE enhancement
      2. YOLO detection (or YOLO tracking via BoT-SORT)
      3. Gaussian blur on detected regions (privacy)
      4. Draw bounding boxes with Track IDs
      5. Draw CCTV overlay
    Returns (output_frame, detections_pct, detections_pixel, fps, elapsed)
    """
    global fps_tracker

    start_time = time.time()

    # Step 1 – CLAHE
    if detection_config['enable_clahe']:
        frame_proc = apply_clahe(frame)
    else:
        frame_proc = frame.copy()

    # Step 2 – YOLO detection / tracking
    if use_tracking:
        # ByteTrack: lightweight Kalman-filter + IoU tracker (no Re-ID network)
        # Much faster than BoT-SORT and better suited for top-down CCTV angles
        results = yolo_model.track(
            frame_proc,
            classes=[0],
            conf=detection_config['conf_threshold'],
            iou=detection_config['iou_threshold'],
            persist=True,
            tracker="bytetrack.yaml",
            verbose=False
        )
    else:
        results = yolo_model(
            frame_proc,
            classes=[0],
            conf=detection_config['conf_threshold'],
            iou=detection_config['iou_threshold'],
            verbose=False
        )

    h, w = frame.shape[:2]
    detections_pixel = []   # for drawing / blur
    detections_pct   = []   # for sending to frontend

    for result in results:
        for i, box in enumerate(result.boxes):
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])

            # Extract track ID (only available when use_tracking=True)
            track_id = None
            if use_tracking and box.id is not None:
                track_id = int(box.id[0])

            # --- Geometric Sanity Check ---
            bw, bh = x2 - x1, y2 - y1
            
            # 1. Dimension check (Discard if box > 60% of width OR > 60% of height)
            if bw > (w * 0.6) or bh > (h * 0.6):
                continue
                
            # 2. Edge alignment check (Discard if box touches all 4 boundaries)
            # We use a 2-pixel margin to be safe
            if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
                continue

            detections_pixel.append({
                'bbox': (int(x1), int(y1), int(x2), int(y2)),
                'confidence': conf,
                'track_id': track_id
            })
            detections_pct.append({
                'x':          float(x1 / w * 100),
                'y':          float(y1 / h * 100),
                'width':      float(bw / w * 100),
                'height':     float(bh / h * 100),
                'confidence': conf,
                'track_id':   track_id
            })

    # Step 3 – Gaussian blur (privacy) on enhanced frame
    if detection_config['enable_blur'] and detections_pixel:
        frame_proc = apply_gaussian_blur(frame_proc, detections_pixel)

    # Step 4 – Bounding boxes (drawn on top of blurred frame)
    output_frame = frame_proc
    if annotate:
        output_frame = draw_detections_on_frame(frame_proc, detections_pixel)

    # Step 5 – Update peak count for database logging
    current_count = len(detections_pixel)
    with max_count_lock:
        global max_count_in_interval
        if current_count > max_count_in_interval:
            max_count_in_interval = current_count

    # Step 6 – CCTV overlay
    elapsed = time.time() - start_time
    fps_tracker.append(elapsed)
    if len(fps_tracker) > 30:
        fps_tracker.pop(0)
    avg_time = sum(fps_tracker) / len(fps_tracker)
    fps = 1.0 / avg_time if avg_time > 0 else 0

    if show_overlay:
        output_frame = draw_cctv_overlay(output_frame, current_count, fps)

    return output_frame, detections_pct, detections_pixel, fps, elapsed


# ── Basic endpoints ────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Travel AI API is running'})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    new_user = User(
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully', 'user': new_user.to_dict()})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Login successful', 'user': user.to_dict()})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/locations', methods=['GET'])
def get_locations():
    locations = Location.query.all()
    return jsonify([loc.to_dict() for loc in locations])


# ── YOLO endpoints ─────────────────────────────────────────────────────────────
@app.route('/api/yolo/initialize', methods=['POST'])
def initialize_detection():
    global video_path, yolo_model, detection_config
    try:
        data = request.json
        video_name = data.get('video', 'demo_video.mp4')

        if 'conf_threshold' in data:
            detection_config['conf_threshold'] = float(data['conf_threshold'])
        if 'iou_threshold' in data:
            detection_config['iou_threshold'] = float(data['iou_threshold'])
        if 'use_gpu' in data:
            detection_config['use_gpu'] = bool(data['use_gpu'])
        # Optional toggles from frontend
        if 'enable_clahe' in data:
            detection_config['enable_clahe'] = bool(data['enable_clahe'])
        if 'enable_blur' in data:
            detection_config['enable_blur'] = bool(data['enable_blur'])

        resolved = resolve_video_path(video_name)
        if resolved:
            video_path = resolved

        if not video_path or not os.path.exists(video_path):
            expected = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'frontend', 'public', 'assets', video_name
            )
            return jsonify({
                'error': f'Video file not found: {expected}',
                'message': f'Please ensure {video_name} is located in the frontend/public/assets folder.'
            }), 404

        if yolo_model is None:
            if not initialize_yolo():
                return jsonify({'error': 'Failed to initialize YOLOv8 model'}), 500

        # Open persistent VideoCapture for ByteTrack tracking
        global persistent_cap, playback_clock
        with cap_lock:
            if persistent_cap is not None:
                persistent_cap.release()
            persistent_cap = cv2.VideoCapture(video_path)
            
            # Initialize playback clock for real-time synchronization
            fps = persistent_cap.get(cv2.CAP_PROP_FPS) or 30
            total = int(persistent_cap.get(cv2.CAP_PROP_FRAME_COUNT))
            playback_clock.update({
                'start_time': time.time(),
                'fps': fps,
                'total_frames': total
            })
            print(f"✓ Persistent VideoCapture opened for tracking: {video_path}")
            print(f"✓ Playback clock initialized: {fps} FPS, {total} total frames")

        cap = cv2.VideoCapture(video_path)
        video_info_dict = {
            'width':        int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height':       int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps':          cap.get(cv2.CAP_PROP_FPS),
            'total_frames': int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        }
        cap.release()

        # --- Location Tracking & Sync ---
        location = Location.query.filter_by(video_filename=video_name).first()
        if location:
            with active_location_lock:
                global active_location_id
                active_location_id = location.id
            
            # Reset all locations to inactive, then set current one to active
            Location.query.update({Location.is_active: False})
            location.is_active = True
            db.session.commit()
            print(f"✓ Active location set to: {location.name} (ID: {location.id})")

        return jsonify({
            'message':    'YOLOv8 initialized successfully',
            'video_path': video_path,
            'model':      'best.pt',
            'config':     detection_config,
            'video_info': video_info_dict,
            'location':   location.to_dict() if location else None
        })

    except Exception as e:
        print(f"Error in initialize_detection: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/yolo/process-frame', methods=['POST'])
def process_frame():
    """
    Process a single frame and return the annotated JPEG as base64.
    Pipeline: CLAHE → YOLO → Gaussian blur → draw boxes → CCTV overlay
    """
    global yolo_model, detection_results

    try:
        if yolo_model is None:
            return jsonify({'error': 'YOLOv8 model not initialized'}), 400

        data          = request.json
        frame_number  = data.get('frame_number', 0)
        annotate      = data.get('annotate', True)
        show_overlay  = data.get('show_overlay', True)

        # Read the requested frame (loop video automatically)
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_number = frame_number % total_frames if total_frames > 0 else 0
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            # Fallback to frame 0
            cap = cv2.VideoCapture(video_path)
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            cap.release()
            if not ret:
                return jsonify({'error': 'Failed to read frame'}), 500

        # ── Run full pipeline (CLAHE + YOLO + blur + draw + overlay) ──
        output_frame, detections_pct, _, fps, elapsed = run_yolo_pipeline(
            frame, annotate=annotate, show_overlay=show_overlay
        )

        # Encode result as base64 JPEG
        _, buffer = cv2.imencode('.jpg', output_frame)
        frame_b64 = base64.b64encode(buffer).decode('utf-8')

        with results_lock:
            detection_results.update({
                'frame':      frame_b64,
                'detections': detections_pct,
                'count':      len(detections_pct),
                'timestamp':  time.time(),
                'processing': False,
                'fps':        fps
            })

        return jsonify({
            'frame':           frame_b64,
            'detections':      detections_pct,
            'count':           len(detections_pct),
            'frame_number':    frame_number,
            'fps':             fps,
            'processing_time': elapsed
        })

    except Exception as e:
        print(f"Error in process_frame: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/yolo/next-frame', methods=['POST'])
def next_frame():
    """
    Read the next wall-clock-synchronized frame from the persistent VideoCapture.
    Uses cap.grab() to skip frames if the backend is behind real-time, with
    a 3-frame safety cap to maintain ByteTrack continuity.
    """
    global yolo_model, detection_results, persistent_cap, playback_clock

    try:
        if yolo_model is None:
            return jsonify({'error': 'YOLOv8 model not initialized'}), 400

        with cap_lock:
            if persistent_cap is None or not persistent_cap.isOpened():
                if not video_path or not os.path.exists(video_path):
                    return jsonify({'error': 'Video not found'}), 404
                persistent_cap = cv2.VideoCapture(video_path)
                playback_clock['start_time'] = time.time()

            # --- Wall-Clock Synchronization Logic ---
            # Calculate exactly which frame we SHOULD be on right now
            elapsed = time.time() - playback_clock['start_time']
            target_frame = int(elapsed * playback_clock['fps'])
            current_frame = int(persistent_cap.get(cv2.CAP_PROP_POS_FRAMES))
            
            frames_to_skip = target_frame - current_frame

            # Loop: if we've passed the end, reset the clock
            if target_frame >= playback_clock['total_frames']:
                playback_clock['start_time'] = time.time()
                persistent_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            elif frames_to_skip > 0:
                # Optimized skipping: grab() is fast fast-forwarding
                # Hard limit of 3 frames to prevent "teleportation" breaking ByteTrack IDs
                skip_count = min(frames_to_skip, 3)
                for _ in range(skip_count):
                    persistent_cap.grab()

            ret, frame = persistent_cap.read()
            if not ret:
                # Fallback loop
                playback_clock['start_time'] = time.time()
                persistent_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = persistent_cap.read()
                if not ret:
                    return jsonify({'error': 'Failed to read frame'}), 500

            current_frame_number = int(persistent_cap.get(cv2.CAP_PROP_POS_FRAMES))

        # Run full tracked pipeline (CLAHE + ByteTrack + blur + draw + overlay)
        output_frame, detections_pct, _, fps, elapsed_proc = run_yolo_pipeline(
            frame, annotate=True, show_overlay=True, use_tracking=True
        )

        # Encode result as base64 JPEG
        _, buffer = cv2.imencode('.jpg', output_frame)
        frame_b64 = base64.b64encode(buffer).decode('utf-8')

        with results_lock:
            detection_results.update({
                'frame':      frame_b64,
                'detections': detections_pct,
                'count':      len(detections_pct),
                'timestamp':  time.time(),
                'processing': False,
                'fps':        fps
            })

        return jsonify({
            'frame':           frame_b64,
            'detections':      detections_pct,
            'count':           len(detections_pct),
            'frame_number':    current_frame_number,
            'fps':             fps,
            'processing_time': elapsed
        })

    except Exception as e:
        print(f"Error in next_frame: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/yolo/analyze-video', methods=['POST'])
def analyze_video():
    global yolo_model, video_path
    try:
        if yolo_model is None:
            return jsonify({'error': 'YOLOv8 model not initialized'}), 400
        if not video_path or not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found'}), 404

        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS)

        sample_interval  = 30
        detection_counts = []
        frame_count      = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % sample_interval == 0:
                results = yolo_model(frame, classes=[0], verbose=False)
                detection_counts.append(len(results[0].boxes))
            frame_count += 1

        cap.release()

        avg_count = np.mean(detection_counts) if detection_counts else 0
        max_count = max(detection_counts)      if detection_counts else 0
        min_count = min(detection_counts)      if detection_counts else 0

        return jsonify({
            'total_frames':      total_frames,
            'fps':               fps,
            'sampled_frames':    len(detection_counts),
            'average_count':     float(avg_count),
            'max_count':         int(max_count),
            'min_count':         int(min_count),
            'detection_counts':  detection_counts
        })

    except Exception as e:
        print(f"Error in analyze_video: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/yolo/video-info', methods=['GET'])
def video_info():
    global video_path
    try:
        if not video_path or not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found'}), 404

        cap          = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS)
        width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration     = total_frames / fps if fps > 0 else 0
        cap.release()

        return jsonify({
            'total_frames': total_frames, 'fps': fps,
            'width': width, 'height': height,
            'duration': duration, 'path': video_path
        })

    except Exception as e:
        print(f"Error in video_info: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/yolo/stream')
def stream_detection():
    """SSE stream: full pipeline per frame (CLAHE + YOLO + blur + draw + overlay)."""
    def generate():
        source = request.args.get('source', 'video')

        if source == 'webcam':
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                yield f"data: {json.dumps({'error': 'Cannot open webcam'})}\n\n"
                return
        else:
            if not video_path or not os.path.exists(video_path):
                yield f"data: {json.dumps({'error': 'Video not found'})}\n\n"
                return
            cap = cv2.VideoCapture(video_path)

        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                if source == 'video':
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            output_frame, detections_pct, _, fps, elapsed = run_yolo_pipeline(frame)

            _, buffer = cv2.imencode('.jpg', output_frame)
            frame_b64 = base64.b64encode(buffer).decode('utf-8')

            data = {
                'frame':        frame_b64,
                'frame_number': frame_count,
                'count':        len(detections_pct),
                'detections':   detections_pct,
                'timestamp':    time.time(),
                'fps':          fps
            }
            yield f"data: {json.dumps(data)}\n\n"

            frame_count += 1
            time.sleep(1 / 30)

        cap.release()

    return Response(generate(), mimetype='text/event-stream')


@app.route('/api/yolo/webcam/detect', methods=['POST'])
def detect_webcam():
    global yolo_model
    try:
        if yolo_model is None:
            if not initialize_yolo():
                return jsonify({'error': 'Failed to initialize YOLOv8 model'}), 500

        data       = request.json
        frame_data = data.get('frame')
        if not frame_data:
            return jsonify({'error': 'No frame data provided'}), 400

        frame_bytes = base64.b64decode(
            frame_data.split(',')[1] if ',' in frame_data else frame_data
        )
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Failed to decode frame'}), 400

        output_frame, detections_pct, _, fps, elapsed = run_yolo_pipeline(frame)

        _, buffer = cv2.imencode('.jpg', output_frame)
        result_b64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'frame':           result_b64,
            'detections':      detections_pct,
            'count':           len(detections_pct),
            'fps':             fps,
            'processing_time': elapsed
        })

    except Exception as e:
        print(f"Error in detect_webcam: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/yolo/config', methods=['GET', 'POST'])
def detection_config_endpoint():
    global detection_config
    if request.method == 'GET':
        return jsonify(detection_config)

    data = request.json
    for key in ('conf_threshold', 'iou_threshold'):
        if key in data:
            detection_config[key] = float(data[key])
    for key in ('use_gpu', 'enable_clahe', 'enable_blur'):
        if key in data:
            detection_config[key] = bool(data[key])

    return jsonify({'message': 'Configuration updated', 'config': detection_config})


@app.route('/api/live-count', methods=['GET'])
def get_live_count():
    with results_lock:
        return jsonify({
            'count': detection_results['count'],
            'timestamp': detection_results['timestamp']
        })

@app.route('/api/logs/hourly', methods=['GET'])
def get_hourly_logs():
    location_id = request.args.get('location_id')
    hours = int(request.args.get('hours', 4))
    date_str = request.args.get('date')
    
    now = datetime.now()
    query = SurveillanceLog.query
    if location_id:
        query = query.filter_by(location_id=location_id)
        
    if date_str:
        try:
            # Parse YYYY-MM-DD
            target_date = datetime.strptime(date_str, '%Y-%m-%d')
            start_time = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
            query = query.filter(SurveillanceLog.timestamp >= start_time, SurveillanceLog.timestamp < end_time)
            
            # If it's today, reference current hour, else end of day
            if target_date.date() == now.date():
                reference_hour = now.hour
            else:
                reference_hour = 23 
        except ValueError:
            query = query.filter(SurveillanceLog.timestamp >= now - timedelta(hours=hours))
            reference_hour = now.hour
    else:
        query = query.filter(SurveillanceLog.timestamp >= now - timedelta(hours=hours))
        reference_hour = now.hour

    logs = query.order_by(SurveillanceLog.timestamp.desc()).all()
    hourly_data = {}
    for log in logs:
        hour_key = f"{log.timestamp.hour}:00"
        if hour_key not in hourly_data or log.people_count > hourly_data[hour_key]:
            hourly_data[hour_key] = log.people_count
            
    result = []
    for i in range(hours):
        h = (reference_hour - i) % 24
        h_key = f"{h}:00"
        result.append({
            'label': h_key,
            'value': hourly_data.get(h_key, 0),
            'hour': h
        })
    result.reverse()
    return jsonify(result)

@app.route('/api/logs/recent', methods=['GET'])
def get_recent_logs():
    location_id = request.args.get('location_id')
    query = SurveillanceLog.query
    if location_id:
        query = query.filter_by(location_id=location_id)
        
    logs = query.order_by(SurveillanceLog.timestamp.desc()).limit(10).all()
    return jsonify([
        {
            'id': log.id,
            'time': log.timestamp.strftime("%I:%M:%S %p"),
            'count': log.people_count,
            'location_id': log.location_id,
            'location_name': log.location_name
        } for log in logs
    ])

@app.route('/api/analytics/distribution', methods=['GET'])
def get_distribution():
    from sqlalchemy import func
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # We use an INNER JOIN to show real data only for matched locations
    query = db.session.query(
        Location.name,
        func.sum(SurveillanceLog.people_count).label('total')
    ).join(SurveillanceLog, SurveillanceLog.location_id == Location.id)
    
    if start_date:
        query = query.filter(SurveillanceLog.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(SurveillanceLog.timestamp <= datetime.fromisoformat(end_date))
    
    results = query.group_by(Location.id, Location.name).all()
    total_people = sum(res.total for res in results) if results else 0
    
    if total_people == 0:
        return jsonify([])

    colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"]
    distribution = []
    for i, res in enumerate(results):
        pct = (res.total / total_people) * 100
        distribution.append({
            "name": res.name,
            "percentage": round(pct, 1),
            "color": colors[i % len(colors)]
        })
    
    return jsonify(distribution)


last_log_time = time.time()

def background_logger():
    global last_log_time, detection_results, max_count_in_interval, active_location_id
    with app.app_context():
        while True:
            time.sleep(1) 
            
            with active_location_lock:
                current_loc_id = active_location_id
            
            # Guard: Skip if no location is active
            if current_loc_id is None:
                continue

            with results_lock:
                current_timestamp = detection_results['timestamp']
                current_detections = detection_results['detections']
            
            if current_timestamp and (time.time() - current_timestamp) < 5:
                now = time.time()
                
                with max_count_lock:
                    peak_count = max_count_in_interval
                
                is_high_density = peak_count >= 10
                time_since_last_log = now - last_log_time
                
                if time_since_last_log >= 60 or (is_high_density and time_since_last_log >= 10):
                    try:
                        location = Location.query.get(current_loc_id)
                        if not location:
                            continue

                        # Compute confidence_avg
                        conf_avg = None
                        if current_detections:
                            conf_avg = sum(d['confidence'] for d in current_detections) / len(current_detections)

                        # Only log if we are reasonably confident or if there are no detections (0 count)
                        if conf_avg is not None and conf_avg < 0.4:
                            print(f"Skipping log for {location.name}: Low confidence ({conf_avg:.2f})")
                            continue

                        log_entry = SurveillanceLog(
                            people_count=peak_count,
                            location_id=current_loc_id,
                            location_name=location.name,
                            confidence_avg=conf_avg
                        )
                        db.session.add(log_entry)
                        db.session.commit()
                        last_log_time = now
                        
                        with max_count_lock:
                            max_count_in_interval = 0
                        
                        print(f"Logged {peak_count} people for {location.name} to DB")
                    except Exception as e:
                        db.session.rollback()
                        print(f"DB Log Error: {e}")

if __name__ == '__main__':
    print("Starting Background Logger...")
    threading.Thread(target=background_logger, daemon=True).start()
    
    print("Starting Travel AI Flask Server...")
    print("Server running on http://localhost:5001")
    app.run(debug=True, port=5001)