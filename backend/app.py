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
import time

load_dotenv()

app = Flask(__name__)
CORS(app)

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
        yolo_model = YOLO('yolov8n.pt')
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
    detections_pixel: list of {'bbox': (x1,y1,x2,y2), 'confidence': float}
    
    FIX: Original code re-converted percentage→pixel inside this function,
    causing a double-conversion when called from process_frame which already
    stored pixel coords. Now we accept raw pixel coords directly.
    """
    annotated = frame.copy()

    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        confidence = det['confidence']

        color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

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


def run_yolo_pipeline(frame, annotate=True, show_overlay=True):
    """
    Full pipeline used by both process_frame and stream_detection:
      1. CLAHE enhancement
      2. YOLO detection
      3. Gaussian blur on detected regions (privacy)
      4. Draw bounding boxes
      5. Draw CCTV overlay
    Returns (output_frame, detections_pct, detections_pixel, fps)
    """
    global fps_tracker

    start_time = time.time()

    # Step 1 – CLAHE
    if detection_config['enable_clahe']:
        frame_proc = apply_clahe(frame)
    else:
        frame_proc = frame.copy()

    # Step 2 – YOLO detection
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
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])

            detections_pixel.append({
                'bbox': (int(x1), int(y1), int(x2), int(y2)),
                'confidence': conf
            })
            detections_pct.append({
                'x':          float(x1 / w * 100),
                'y':          float(y1 / h * 100),
                'width':      float((x2 - x1) / w * 100),
                'height':     float((y2 - y1) / h * 100),
                'confidence': conf
            })

    # Step 3 – Gaussian blur (privacy) on enhanced frame
    if detection_config['enable_blur'] and detections_pixel:
        frame_proc = apply_gaussian_blur(frame_proc, detections_pixel)

    # Step 4 – Bounding boxes (drawn on top of blurred frame)
    output_frame = frame_proc
    if annotate:
        output_frame = draw_detections_on_frame(frame_proc, detections_pixel)

    # Step 5 – CCTV overlay
    elapsed = time.time() - start_time
    fps_tracker.append(elapsed)
    if len(fps_tracker) > 30:
        fps_tracker.pop(0)
    avg_time = sum(fps_tracker) / len(fps_tracker)
    fps = 1.0 / avg_time if avg_time > 0 else 0

    if show_overlay:
        output_frame = draw_cctv_overlay(output_frame, len(detections_pixel), fps)

    return output_frame, detections_pct, detections_pixel, fps, elapsed


# ── Basic endpoints ────────────────────────────────────────────────────────────
user_profiles = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Travel AI API is running'})

@app.route('/api/profile', methods=['GET', 'POST'])
def user_profile():
    try:
        user_id = request.args.get('user_id', 'default_user')
        if request.method == 'GET':
            profile = user_profiles.get(user_id, {'beenThere': [], 'wantToGo': []})
            return jsonify(profile)
        data = request.json
        user_profiles[user_id] = data
        return jsonify({'message': 'Profile updated successfully', 'profile': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations', methods=['GET'])
def get_locations():
    return jsonify({
        'message': 'Locations endpoint',
        'note': 'Location data is served from the frontend JSON file'
    })


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
                'message': 'Please place demo_video.mp4 in frontend/public/assets folder'
            }), 404

        if yolo_model is None:
            if not initialize_yolo():
                return jsonify({'error': 'Failed to initialize YOLOv8 model'}), 500

        cap = cv2.VideoCapture(video_path)
        video_info = {
            'width':        int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height':       int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps':          cap.get(cv2.CAP_PROP_FPS),
            'total_frames': int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        }
        cap.release()

        return jsonify({
            'message':    'YOLOv8 initialized successfully',
            'video_path': video_path,
            'model':      'yolov8n.pt',
            'config':     detection_config,
            'video_info': video_info
        })

    except Exception as e:
        print(f"Error in initialize_detection: {str(e)}")
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


if __name__ == '__main__':
    print("Starting Travel AI Flask Server...")
    print("Server running on http://localhost:5001")
    app.run(debug=True, port=5001)