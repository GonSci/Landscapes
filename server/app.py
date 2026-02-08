from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import json
from threading import Thread, Lock
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Hugging Face API configuration
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')

# Initialize Hugging Face Inference Client
client = InferenceClient(token=HUGGINGFACE_API_KEY) if HUGGINGFACE_API_KEY else None

# YOLOv8 Configuration
yolo_model = None
video_path = None
video_cap = None
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
    api_key_status = "configured" if HUGGINGFACE_API_KEY else "missing"
    api_key_preview = f"{HUGGINGFACE_API_KEY[:10]}..." if HUGGINGFACE_API_KEY else "None"
    
    return jsonify({
        'status': 'healthy',
        'message': 'Travel AI API is running',
        'huggingface_api_key': api_key_status,
        'api_key_preview': api_key_preview
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle AI chat requests"""
    try:
        data = request.json
        user_message = data.get('message', '')
        location = data.get('location', None)
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Create context-aware prompt with detailed location info
        system_prompt = """You are a friendly and knowledgeable AI travel assistant specializing in the Philippines. 
        You help tourists discover Philippine culture, traditions, local cuisine, festivals, and travel tips.
        Provide helpful, accurate, and engaging information about Philippine destinations, attractions, and local experiences.
        Keep responses concise but informative (2-4 paragraphs maximum)."""
        
        # Enhanced location context
        if location:
            if isinstance(location, dict):
                location_name = location.get('name', 'this location')
                region = location.get('region', 'Philippines')
                loc_type = location.get('locationType', '')
                full_address = location.get('fullAddress', '')
                is_custom = location.get('isCustom', False)
                
                system_prompt += f"\n\nThe user is asking about {location_name} in {region}, Philippines."
                if full_address:
                    system_prompt += f"\nFull location: {full_address}"
                if is_custom:
                    system_prompt += f"\nThis is a dynamically discovered location - provide general information about this area and nearby attractions."
            else:
                # Fallback if location is just a string
                system_prompt += f"\n\nThe user is currently asking about {location} in the Philippines."
        
        # Prepare the prompt for Hugging Face (simplified format)
        simple_prompt = f"{system_prompt}\n\nQuestion: {user_message}\n\nAnswer:"
        
        # Call Hugging Face API using the new client
        if not client:
            return jsonify({
                'response': get_fallback_response(user_message, location)
            })
        
        try:
            # Use chat completion for better compatibility
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            response = client.chat_completion(
                messages=messages,
                model="meta-llama/Llama-3.2-3B-Instruct",
                max_tokens=250,
            )
            
            # Extract the response
            ai_response = response.choices[0].message.content.strip()
            
            print(f"HuggingFace Response: {ai_response}")
            
            # Fallback if response is empty
            if not ai_response or len(ai_response) < 10:
                print("Warning: Empty or too short response from HuggingFace, using fallback")
                ai_response = get_fallback_response(user_message, location)
            
            return jsonify({'response': ai_response})
            
        except Exception as api_error:
            print(f"HuggingFace API Error: {str(api_error)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'response': get_fallback_response(user_message, location)
            })
            
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'response': "I apologize, but I'm having trouble connecting right now. The Philippines is a beautiful archipelago with over 7,000 islands! Each region offers unique experiences from pristine beaches to historic landmarks. What would you like to know more about?"
        })

def get_fallback_response(message, location):
    """Provide fallback responses when AI is unavailable"""
    message_lower = message.lower()
    
    # Handle location object or string
    location_name = None
    location_region = None
    
    if location:
        if isinstance(location, dict):
            location_name = location.get('name', 'this location')
            location_region = location.get('region', 'Philippines')
        else:
            location_name = str(location)
    
    if location_name:
        return f"{location_name} is a wonderful destination in {location_region or 'the Philippines'}! It offers rich cultural experiences, beautiful scenery, and warm hospitality. Would you like to know about specific attractions, local food, festivals, or travel tips for this area?"
    
    if any(word in message_lower for word in ['food', 'eat', 'cuisine', 'dish']):
        return "Philippine cuisine is diverse and delicious! Popular dishes include Adobo (savory stew), Sinigang (sour soup), Lechon (roasted pig), Pancit (noodles), and Halo-halo (dessert). Each region has its own specialties. What specific dish or region would you like to explore?"
    
    if any(word in message_lower for word in ['festival', 'celebration', 'event']):
        return "The Philippines celebrates numerous colorful festivals! Major ones include Sinulog in Cebu (January), Ati-Atihan in Aklan (January), Panagbenga in Baguio (February), and MassKara in Bacolod (October). These festivals showcase Filipino culture through music, dance, and vibrant costumes!"
    
    if any(word in message_lower for word in ['beach', 'island', 'dive', 'swim']):
        return "The Philippines is famous for its stunning beaches! Top destinations include Boracay (white sand), Palawan (lagoons and limestone cliffs), Siargao (surfing), Bohol (diving), and Bantayan Island (peaceful getaway). The clear waters are perfect for diving, snorkeling, and island hopping!"
    
    return "Welcome to the Philippines! This beautiful country offers pristine beaches, rich cultural heritage, delicious cuisine, and warm hospitality. From Manila's historic sites to Palawan's natural wonders, there's so much to discover. What would you like to explore?"

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
        
        # Set video path (assuming video is in public/assets folder)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        video_path = os.path.join(base_dir, 'public', 'assets', video_name)
        
        # Check if video exists
        if not os.path.exists(video_path):
            return jsonify({
                'error': f'Video file not found: {video_path}',
                'message': 'Please place demo_video.mp4 in the public/assets folder'
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
    # Check if API key is configured
    if not HUGGINGFACE_API_KEY:
        print("WARNING: HUGGINGFACE_API_KEY not found in environment variables")
        print("Please create a .env file with your Hugging Face API key")
    
    print("Starting Travel AI Flask Server...")
    print("Server running on http://localhost:5001")
    print("Note: Using port 5001 to avoid conflict with macOS AirPlay Receiver")
    app.run(debug=True, port=5001)
