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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# YOLOv8 Configuration
yolo_model = None
video_path = None
detection_config = {
    'conf_threshold': 0.5,
    'iou_threshold': 0.45,
    'use_gpu': True
}
detection_results = {
    'frame': None,
    'detections': [],
    'count': 0,
    'timestamp': None,
    'processing': False,
    'fps': 0
}
results_lock = Lock()
fps_tracker = []

def resolve_video_path(video_name):
    """Resolve video path across new and legacy project layouts."""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Allow absolute paths for explicit debugging/testing requests.
    if os.path.isabs(video_name):
        return video_name if os.path.exists(video_name) else None

    candidates = [
        os.path.join(project_root, 'frontend', 'public', 'assets', video_name),
        os.path.join(project_root, 'public', 'assets', video_name),  # legacy layout
        os.path.join(project_root, 'backend', video_name),
    ]

    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate

    return None

def initialize_yolo():
    """Initialize YOLOv8 model with GPU support"""
    global yolo_model
    try:
        print("Loading YOLOv8 model...")
        yolo_model = YOLO('yolov8n.pt')  # Using nano model for faster processing
        
        # Set device (GPU if available)
        if detection_config['use_gpu'] and cv2.cuda.getCudaEnabledDeviceCount() > 0:
            print("✓ GPU detected, using CUDA acceleration")
        else:
            print("✓ Using CPU for inference")
        
        print("YOLOv8 model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading YOLOv8 model: {str(e)}")
        return False

def draw_detections_on_frame(frame, detections):
    """Draw bounding boxes and labels on frame"""
    annotated = frame.copy()
    
    for det in detections:
        x1 = int(det['x'] * frame.shape[1] / 100)
        y1 = int(det['y'] * frame.shape[0] / 100)
        x2 = int((det['x'] + det['width']) * frame.shape[1] / 100)
        y2 = int((det['y'] + det['height']) * frame.shape[0] / 100)
        confidence = det['confidence']
        
        # Draw bounding box
        color = (0, 255, 0)  # Green
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        
        # Draw label with confidence
        label = f"Person {confidence:.2f}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_y = max(y1, label_size[1] + 10)
        
        # Label background
        cv2.rectangle(annotated, (x1, label_y - label_size[1] - 10),
                     (x1 + label_size[0], label_y + 5), color, -1)
        
        # Label text
        cv2.putText(annotated, label, (x1, label_y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    return annotated

def draw_cctv_overlay(frame, people_count, fps):
    """Draw CCTV-style overlay with timestamp, count, and FPS"""
    overlay = frame.copy()
    h, w = frame.shape[:2]
    
    # Semi-transparent black bar at top
    cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
    frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)
    
    # Current timestamp
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    # Timestamp (left)
    cv2.putText(frame, f"CCTV - {timestamp}", (10, 30), 
               font, 0.6, (255, 255, 255), 2)
    
    # People count (center)
    count_text = f"PEOPLE: {people_count}"
    count_size = cv2.getTextSize(count_text, font, 0.8, 2)[0]
    count_x = (w - count_size[0]) // 2
    cv2.putText(frame, count_text, (count_x, 30), 
               font, 0.8, (0, 255, 0), 2)
    
    # FPS (right)
    fps_text = f"FPS: {fps:.1f}"
    fps_size = cv2.getTextSize(fps_text, font, 0.6, 2)[0]
    fps_x = w - fps_size[0] - 10
    cv2.putText(frame, fps_text, (fps_x, 30), 
               font, 0.6, (0, 255, 255), 2)
    
    # Config info
    config_info = f"Conf: {detection_config['conf_threshold']} | IoU: {detection_config['iou_threshold']}"
    cv2.putText(frame, config_info, (10, 60), 
               font, 0.4, (200, 200, 200), 1)
    
    return frame

# In-memory storage (in production, use a database)
user_profiles = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Travel AI API is running'
    })

@app.route('/api/profile', methods=['GET', 'POST'])
def user_profile():
    """Handle user profile data"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        
        if request.method == 'GET':
            profile = user_profiles.get(user_id, {
                'beenThere': [],
                'wantToGo': []
            })
            return jsonify(profile)
        
        elif request.method == 'POST':
            data = request.json
            user_profiles[user_id] = data
            return jsonify({
                'message': 'Profile updated successfully',
                'profile': data
            })
            
    except Exception as e:
        print(f"Error in profile endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all Philippines locations data"""
    try:
        # In a real app, this would come from a database
        # For now, return a simple response
        return jsonify({
            'message': 'Locations endpoint',
            'note': 'Location data is served from the frontend JSON file'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== YOLOv8 Crowd Detection Endpoints ==========

@app.route('/api/yolo/initialize', methods=['POST'])
def initialize_detection():
    """Initialize YOLOv8 model and set video path with custom config"""
    global video_path, yolo_model, detection_config
    try:
        data = request.json
        video_name = data.get('video', 'demo_video.mp4')
        
        # Update detection config if provided
        if 'conf_threshold' in data:
            detection_config['conf_threshold'] = float(data['conf_threshold'])
        if 'iou_threshold' in data:
            detection_config['iou_threshold'] = float(data['iou_threshold'])
        if 'use_gpu' in data:
            detection_config['use_gpu'] = bool(data['use_gpu'])
        
        # Resolve video path across supported repository layouts.
        resolved_video_path = resolve_video_path(video_name)
        if resolved_video_path:
            video_path = resolved_video_path
        
        # Check if video exists
        if not video_path or not os.path.exists(video_path):
            expected_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'frontend',
                'public',
                'assets',
                video_name,
            )
            return jsonify({
                'error': f'Video file not found: {expected_path}',
                'message': 'Please place demo_video.mp4 in frontend/public/assets folder'
            }), 404
        
        # Initialize YOLO model if not already loaded
        if yolo_model is None:
            success = initialize_yolo()
            if not success:
                return jsonify({'error': 'Failed to initialize YOLOv8 model'}), 500
        
        # Get video info
        cap = cv2.VideoCapture(video_path)
        video_info = {
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'total_frames': int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        }
        cap.release()
        
        return jsonify({
            'message': 'YOLOv8 initialized successfully',
            'video_path': video_path,
            'model': 'yolov8n.pt',
            'config': detection_config,
            'video_info': video_info
        })
        
    except Exception as e:
        print(f"Error in initialize_detection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/yolo/process-frame', methods=['POST'])
def process_frame():
    """Process a single frame with YOLOv8 detection and return annotated frame"""
    global yolo_model, detection_results, fps_tracker
    
    try:
        if yolo_model is None:
            return jsonify({'error': 'YOLOv8 model not initialized'}), 400
        
        data = request.json
        frame_number = data.get('frame_number', 0)
        annotate = data.get('annotate', True)  # Return annotated frame by default
        show_overlay = data.get('show_overlay', True)  # Show CCTV overlay
        
        start_time = time.time()
        
        # Open video and seek to frame
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Loop video if frame_number exceeds total frames
        if frame_number >= total_frames:
            frame_number = frame_number % total_frames
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            # If still can't read, try frame 0
            cap = cv2.VideoCapture(video_path)
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return jsonify({'error': 'Failed to read frame'}), 500
        
        # Run YOLOv8 detection with configured thresholds
        results = yolo_model(
            frame,
            classes=[0],  # class 0 = person
            conf=detection_config['conf_threshold'],
            iou=detection_config['iou_threshold'],
            verbose=False
        )
        
        # Extract detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0])
                
                # Convert to percentages for frontend
                h, w = frame.shape[:2]
                detections.append({
                    'x': float(x1 / w * 100),
                    'y': float(y1 / h * 100),
                    'width': float((x2 - x1) / w * 100),
                    'height': float((y2 - y1) / h * 100),
                    'confidence': conf
                })
        
        # Calculate FPS
        elapsed = time.time() - start_time
        fps_tracker.append(elapsed)
        if len(fps_tracker) > 30:
            fps_tracker.pop(0)
        avg_time = sum(fps_tracker) / len(fps_tracker)
        fps = 1.0 / avg_time if avg_time > 0 else 0
        
        # Annotate frame if requested
        output_frame = frame
        if annotate:
            output_frame = draw_detections_on_frame(frame, detections)
        
        if show_overlay:
            output_frame = draw_cctv_overlay(output_frame, len(detections), fps)
        
        # Encode frame as base64
        _, buffer = cv2.imencode('.jpg', output_frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')
        
        with results_lock:
            detection_results = {
                'frame': frame_base64,
                'detections': detections,
                'count': len(detections),
                'timestamp': time.time(),
                'processing': False,
                'fps': fps
            }
        
        return jsonify({
            'frame': frame_base64,
            'detections': detections,
            'count': len(detections),
            'frame_number': frame_number,
            'fps': fps,
            'processing_time': elapsed
        })
        
    except Exception as e:
        print(f"Error in process_frame: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/yolo/analyze-video', methods=['POST'])
def analyze_video():
    """Analyze entire video and return aggregate statistics"""
    global yolo_model, video_path
    
    try:
        if yolo_model is None:
            return jsonify({'error': 'YOLOv8 model not initialized'}), 400
        
        if not video_path or not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found'}), 404
        
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Sample frames (every 30 frames for faster processing)
        sample_interval = 30
        detection_counts = []
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % sample_interval == 0:
                # Run detection
                results = yolo_model(frame, classes=[0], verbose=False)
                count = len(results[0].boxes)
                detection_counts.append(count)
            
            frame_count += 1
        
        cap.release()
        
        # Calculate statistics
        avg_count = np.mean(detection_counts) if detection_counts else 0
        max_count = max(detection_counts) if detection_counts else 0
        min_count = min(detection_counts) if detection_counts else 0
        
        return jsonify({
            'total_frames': total_frames,
            'fps': fps,
            'sampled_frames': len(detection_counts),
            'average_count': float(avg_count),
            'max_count': int(max_count),
            'min_count': int(min_count),
            'detection_counts': detection_counts
        })
        
    except Exception as e:
        print(f"Error in analyze_video: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/yolo/video-info', methods=['GET'])
def video_info():
    """Get video file information"""
    global video_path
    
    try:
        if not video_path or not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found'}), 404
        
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        cap.release()
        
        return jsonify({
            'total_frames': total_frames,
            'fps': fps,
            'width': width,
            'height': height,
            'duration': duration,
            'path': video_path
        })
        
    except Exception as e:
        print(f"Error in video_info: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/yolo/stream')
def stream_detection():
    """Stream video with real-time YOLOv8 detection"""
    def generate():
        global yolo_model, video_path, fps_tracker
        
        source = request.args.get('source', 'video')  # 'video' or 'webcam'
        
        # Open source
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
            start_time = time.time()
            
            ret, frame = cap.read()
            if not ret:
                if source == 'video':
                    # Loop video
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break
            
            # Process frame with YOLO
            results = yolo_model(
                frame, 
                classes=[0],
                conf=detection_config['conf_threshold'],
                iou=detection_config['iou_threshold'],
                verbose=False
            )
            
            # Extract detections
            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0])
                    
                    h, w = frame.shape[:2]
                    detections.append({
                        'x': float(x1 / w * 100),
                        'y': float(y1 / h * 100),
                        'width': float((x2 - x1) / w * 100),
                        'height': float((y2 - y1) / h * 100),
                        'confidence': conf
                    })
            
            # Calculate FPS
            elapsed = time.time() - start_time
            fps_tracker.append(elapsed)
            if len(fps_tracker) > 30:
                fps_tracker.pop(0)
            avg_time = sum(fps_tracker) / len(fps_tracker)
            fps = 1.0 / avg_time if avg_time > 0 else 0
            
            # Annotate frame
            annotated = draw_detections_on_frame(frame, detections)
            annotated = draw_cctv_overlay(annotated, len(detections), fps)
            
            # Encode frame
            _, buffer = cv2.imencode('.jpg', annotated)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Send detection data
            data = {
                'frame': frame_base64,
                'frame_number': frame_count,
                'count': len(detections),
                'detections': detections,
                'timestamp': time.time(),
                'fps': fps
            }
            
            yield f"data: {json.dumps(data)}\n\n"
            
            frame_count += 1
            time.sleep(1/30)  # Target 30 FPS
        
        cap.release()
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/yolo/webcam/detect', methods=['POST'])
def detect_webcam():
    """Process webcam frame with YOLOv8 detection"""
    global yolo_model, fps_tracker
    
    try:
        if yolo_model is None:
            # Initialize model if not loaded
            success = initialize_yolo()
            if not success:
                return jsonify({'error': 'Failed to initialize YOLOv8 model'}), 500
        
        # Get frame data from request (base64 encoded)
        data = request.json
        frame_data = data.get('frame')
        
        if not frame_data:
            return jsonify({'error': 'No frame data provided'}), 400
        
        # Decode base64 frame
        frame_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Failed to decode frame'}), 400
        
        start_time = time.time()
        
        # Run detection
        results = yolo_model(
            frame,
            classes=[0],
            conf=detection_config['conf_threshold'],
            iou=detection_config['iou_threshold'],
            verbose=False
        )
        
        # Extract detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0])
                
                h, w = frame.shape[:2]
                detections.append({
                    'x': float(x1 / w * 100),
                    'y': float(y1 / h * 100),
                    'width': float((x2 - x1) / w * 100),
                    'height': float((y2 - y1) / h * 100),
                    'confidence': conf
                })
        
        # Calculate FPS
        elapsed = time.time() - start_time
        fps_tracker.append(elapsed)
        if len(fps_tracker) > 30:
            fps_tracker.pop(0)
        avg_time = sum(fps_tracker) / len(fps_tracker)
        fps = 1.0 / avg_time if avg_time > 0 else 0
        
        # Annotate frame
        annotated = draw_detections_on_frame(frame, detections)
        annotated = draw_cctv_overlay(annotated, len(detections), fps)
        
        # Encode result
        _, buffer = cv2.imencode('.jpg', annotated)
        result_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'frame': result_base64,
            'detections': detections,
            'count': len(detections),
            'fps': fps,
            'processing_time': elapsed
        })
        
    except Exception as e:
        print(f"Error in detect_webcam: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/yolo/config', methods=['GET', 'POST'])
def detection_config_endpoint():
    """Get or update detection configuration"""
    global detection_config
    
    if request.method == 'GET':
        return jsonify(detection_config)
    
    elif request.method == 'POST':
        data = request.json
        
        if 'conf_threshold' in data:
            detection_config['conf_threshold'] = float(data['conf_threshold'])
        if 'iou_threshold' in data:
            detection_config['iou_threshold'] = float(data['iou_threshold'])
        if 'use_gpu' in data:
            detection_config['use_gpu'] = bool(data['use_gpu'])
        
        return jsonify({
            'message': 'Configuration updated',
            'config': detection_config
        })

if __name__ == '__main__':
    print("Starting Travel AI Flask Server...")
    print("Server running on http://localhost:5001")
    print("Note: Using port 5001 to avoid conflict with macOS AirPlay Receiver")
    app.run(debug=True, port=5001)
