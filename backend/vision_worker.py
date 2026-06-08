#!/usr/bin/env python3
"""
Vision Worker Service - Multi-Stream Architecture
Processes active locations on local GPU, offloads background locations to Mac via LAN.
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
import requests

from extensions import db
from models import Location, SurveillanceLog
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

load_dotenv()

# ── Distributed Worker Config ──────────────────────────────────────────────────
# CHANGE THIS TO YOUR MACBOOK'S IP ADDRESS
MAC_WORKER_URL = "http://192.168.1.20:5005/predict_background"

# Mock class to rebuild JSON data from Mac back into Python objects
class MockSAHIResult:
    class MockBbox:
        def __init__(self, minx, miny, maxx, maxy):
            self.minx, self.miny, self.maxx, self.maxy = minx, miny, maxx, maxy
    class MockCategory:
        def __init__(self, id_val): self.id = id_val
    class MockScore:
        def __init__(self, val): self.value = val
    class MockPrediction:
        def __init__(self, box, conf, cls_id):
            self.bbox = MockSAHIResult.MockBbox(*box)
            self.score = MockSAHIResult.MockScore(conf)
            self.category = MockSAHIResult.MockCategory(cls_id)

    def __init__(self, preds_data):
        self.object_prediction_list = [self.MockPrediction(p['bbox'], p['score'], p['category_id']) for p in preds_data]

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_blur': True,
    'min_bbox_area': 400,         
    'min_person_ratio': 0.3,      
    'max_person_ratio': 6.0,      
}

LOCATION_PIPELINE_CONFIG = {
    1: {'conf': 0.25, 'slice_size': 256, 'use_clahe': False, 'use_sahi': False, 'overlap': 0.15}, # NO SAHI
    2: {'conf': 0.40, 'slice_size': 512, 'use_clahe': True,  'use_sahi': False, 'overlap': 0.15}, # 512 SAHI
    3: {'conf': 0.35, 'slice_size': 384, 'use_clahe': True,  'use_sahi': False, 'overlap': 0.15}, # 384 SAHI
    4: {'conf': 0.45, 'slice_size': 384, 'use_clahe': True,  'use_sahi': False, 'overlap': 0.15}, # 384 SAHI
    5: {'conf': 0.20, 'slice_size': 512, 'use_clahe': False, 'use_sahi': False, 'overlap': 0.15}, # 512 SAHI
}

DEFAULT_PIPELINE_CONFIG = {
    'conf': 0.35, 'slice_size': 448, 'use_clahe': True, 'use_sahi': False, 'overlap': 0.15,
}

LOCATION_HIGH_THRESHOLDS = {1: 15, 2: 38, 3: 14, 4: 15, 5: 66}

YOLO_MODEL = None

import queue as _queue
INFERENCE_ACTIVE_QUEUE     = _queue.Queue(maxsize=1)   
INFERENCE_BACKGROUND_QUEUE = _queue.Queue(maxsize=5)   
INFERENCE_OUTPUT_QUEUES    = {}                         

DEVICE_INFO = {
    'device': 'cpu', 'use_tensorrt': False, 'use_coreml': False, 
    'gpu_name': None, 'backend': 'pytorch',
}

THREAD_FRAMES = {}       
THREAD_COUNTS = {}       
THREAD_MAX_COUNTS = {}   
STREAM_LOCK = threading.Lock()

last_log_time_per_location = {}
last_log_time_lock = threading.Lock()

active_locations = {}              
active_locations_lock = threading.Lock()
ACTIVE_LOCATION_TIMEOUT = 15       

def detect_device():
    info = {'device': 'cpu', 'use_tensorrt': False, 'use_coreml': False, 'gpu_name': None, 'backend': 'pytorch'}
    backend_dir = os.path.dirname(os.path.abspath(__file__))

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

    if sys.platform == 'darwin' and platform.machine() == 'arm64':
        info['gpu_name'] = 'Apple M-Series (ANE/GPU)'
        info['device'] = 'mps' 
        print("[VISION] Apple Silicon detected.")

        if os.path.exists(os.path.join(backend_dir, 'best.mlpackage')):
            info['use_coreml'] = True
            info['backend'] = 'coreml'
            print("[VISION] CoreML package found — using CoreML backend")
        else:
            print("[VISION] No best.mlpackage found. Will fallback to PyTorch MPS.")
        return info

    print("[VISION] No hardware acceleration detected — running on CPU")
    return info

class TensorRTDetectionModel(DetectionModel):
    def __init__(self, engine_path: str, conf: float, device: str):
        super().__init__(
            model_path=engine_path, confidence_threshold=conf, device=device,
            category_mapping={0: 'person'}, category_remapping=None,
            load_at_init=False, image_size=None,
        )
        self.load_model()

    def load_model(self):
        from ultralytics import YOLO as UltralyticsYOLO
        self.model = UltralyticsYOLO(self.model_path, task='detect')
        self.set_model(self.model)

    def set_model(self, model):
        self.model = model
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        self._original_predictions = self.model.predict(
            source=image, conf=self.confidence_threshold, device=self.device,
            classes=[0], verbose=False, half=True,
        )

    def convert_original_predictions(self, shift_amount=None, full_shape=None):
        from sahi.prediction import ObjectPrediction
        if shift_amount is None: shift_amount = [0, 0]
        object_prediction_list = []
        results = self._original_predictions

        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            img_h, img_w = results[0].orig_shape
            if full_shape is None: full_shape = [img_h, img_w]

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf   = float(boxes.conf[i].item())
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                try:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], score=conf, category_id=cls_id,
                        category_name='person', shift_amount=shift_amount, full_shape=full_shape,
                    )
                except TypeError:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], bool_mask=None, score=conf, category_id=cls_id,
                        category_name='person', shift_amount=shift_amount, full_shape=full_shape,
                    )
                object_prediction_list.append(pred)
        self._object_prediction_list_per_image = [object_prediction_list]

class CoreMLDetectionModel(DetectionModel):
    def __init__(self, mlpackage_path: str, conf: float):
        super().__init__(
            model_path=mlpackage_path, confidence_threshold=conf, device='cpu', 
            category_mapping={0: 'person'}, category_remapping=None,
            load_at_init=False, image_size=None,
        )
        self.load_model()

    def load_model(self):
        from ultralytics import YOLO as UltralyticsYOLO
        self.model = UltralyticsYOLO(self.model_path, task='detect')
        self.set_model(self.model)

    def set_model(self, model):
        self.model = model
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        self._original_predictions = self.model.predict(
            source=image, conf=self.confidence_threshold, classes=[0],
            verbose=False, imgsz=800,
        )

    def convert_original_predictions(self, shift_amount=None, full_shape=None):
        from sahi.prediction import ObjectPrediction
        if shift_amount is None: shift_amount = [0, 0]
        object_prediction_list = []
        results = self._original_predictions

        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            img_h, img_w = results[0].orig_shape
            if full_shape is None: full_shape = [img_h, img_w]

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf   = float(boxes.conf[i].item())
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                try:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], score=conf, category_id=cls_id,
                        category_name='person', shift_amount=shift_amount, full_shape=full_shape,
                    )
                except TypeError:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], bool_mask=None, score=conf, category_id=cls_id,
                        category_name='person', shift_amount=shift_amount, full_shape=full_shape,
                    )
                object_prediction_list.append(pred)
        self._object_prediction_list_per_image = [object_prediction_list]

def load_model(device_info: dict):
    conf  = DEFAULT_PIPELINE_CONFIG['conf']
    device = device_info['device']
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    if device_info['use_tensorrt']:
        engine_path = os.path.join(backend_dir, 'best.engine')
        return TensorRTDetectionModel(engine_path, conf=conf, device=device)
    elif device_info['use_coreml']:
        mlpackage_path = os.path.join(backend_dir, 'best.mlpackage')
        return CoreMLDetectionModel(mlpackage_path, conf=conf)
    else:
        pt_path = os.path.join(backend_dir, 'best.pt')
        sahi_device = '0' if device == 'cuda:0' else device
        return AutoDetectionModel.from_pretrained(
            model_type='yolov8', model_path=pt_path,
            confidence_threshold=conf, device=sahi_device,
        )

def run_inference(model, frame_proc: np.ndarray, device_info: dict, loc_config: dict):
    if loc_config['use_sahi']:
        return get_sliced_prediction(
            frame_proc, model,
            slice_height=loc_config['slice_size'], slice_width=loc_config['slice_size'],
            overlap_height_ratio=loc_config['overlap'], overlap_width_ratio=loc_config['overlap'],
            postprocess_match_metric="IOU", postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
            postprocess_class_agnostic=True, verbose=False,
        )
    else:
        return get_prediction(frame_proc, model, verbose=False)

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
        if os.path.exists(candidate): return candidate
    return None

_CLAHE = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))

def apply_clahe(frame):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    cl = _CLAHE.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def apply_gaussian_blur(frame, detections_pixel, ksize=(51, 51)):
    h_img, w_img = frame.shape[:2]
    blurred_full = cv2.GaussianBlur(frame, ksize, 0)
    mask = np.zeros((h_img, w_img), dtype=np.uint8)
    for det in detections_pixel:
        x1, y1, x2, y2 = det['bbox']
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)
        if x2 > x1 and y2 > y1:
            cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
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
    backend_text = f"Backend: {DEVICE_INFO['backend'].upper()} (Distributed)"
    cv2.putText(frame, backend_text, (10, 30), font, 0.5, (200, 200, 200), 1)
    date_size = cv2.getTextSize(timestamp, font, 0.6, 2)[0]
    cv2.putText(frame, timestamp, (w - date_size[0] - 10, h - 10), font, 0.6, (255, 255, 255), 2)
    return frame

# ── Distributed Inference Worker ───────────────────────────────────────────────
def gpu_inference_worker():
    global YOLO_MODEL
    print("[VISION] GPU inference worker started (Distributed Master Mode)")
    while True:
        try:
            # --- PRIORITY 1: PC TENSORRT (ACTIVE ONLY) ---
            try:
                item = INFERENCE_ACTIVE_QUEUE.get_nowait()
                location_id, frame_proc, is_active, conf_threshold, loc_config = item
                
                YOLO_MODEL.confidence_threshold = conf_threshold
                results = run_inference(YOLO_MODEL, frame_proc, DEVICE_INFO, loc_config)
                
                try: INFERENCE_OUTPUT_QUEUES[location_id].get_nowait()
                except _queue.Empty: pass
                INFERENCE_OUTPUT_QUEUES[location_id].put(results)
            except _queue.Empty:
                pass 

            # --- PRIORITY 2: MAC COREML OFFLOAD (BACKGROUND ONLY) ---
            try:
                bg_item = INFERENCE_BACKGROUND_QUEUE.get_nowait()
                bg_loc, bg_frame, bg_active, bg_conf, bg_cfg = bg_item
                
                ret, buffer = cv2.imencode('.jpg', bg_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ret:
                    try:
                        response = requests.post(
                            MAC_WORKER_URL,
                            files={'frame': ('frame.jpg', buffer.tobytes(), 'image/jpeg')},
                            data={
                                'conf': bg_conf,
                                'use_sahi': str(bg_cfg['use_sahi']),
                                'slice_size': bg_cfg['slice_size'],
                                'overlap': bg_cfg['overlap']
                            },
                            timeout=2.0 
                        )
                        
                        if response.status_code == 200:
                            preds_data = response.json().get('predictions', [])
                            bg_results = MockSAHIResult(preds_data)
                            
                            try: INFERENCE_OUTPUT_QUEUES[bg_loc].get_nowait()
                            except _queue.Empty: pass
                            INFERENCE_OUTPUT_QUEUES[bg_loc].put(bg_results)
                    except requests.exceptions.RequestException as e:
                        print(f"[VISION] Mac Worker unreachable or timeout: {e}")
            except _queue.Empty:
                pass

            time.sleep(0.01) 

        except Exception as e:
            print(f"[VISION] gpu_inference_worker error: {e}")

def run_yolo_pipeline(frame_proc, frame_raw, location_id, tracker, last_tracked_objects, is_active=True, annotate=True):
    loc_config = LOCATION_PIPELINE_CONFIG.get(location_id, DEFAULT_PIPELINE_CONFIG)
    conf_threshold = loc_config['conf']
    
    target_queue = INFERENCE_ACTIVE_QUEUE if is_active else INFERENCE_BACKGROUND_QUEUE
    try:
        target_queue.put_nowait((location_id, frame_proc, is_active, conf_threshold, loc_config))
    except _queue.Full:
        pass

    new_results = None
    try:
        new_results = INFERENCE_OUTPUT_QUEUES[location_id].get_nowait()
    except _queue.Empty:
        pass 

    h, w = frame_raw.shape[:2]
    current_tracked_objects = []

    if new_results is not None:
        xyxy = []
        confidences = []
        
        for obj in new_results.object_prediction_list:
            if obj.category.id != 0: continue 
            
            x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
            conf = obj.score.value
            bw, bh = x2 - x1, y2 - y1

            if bw > (w * 0.6) or bh > (h * 0.6): continue
            if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2): continue
            if bw * bh < DETECTION_CONFIG['min_bbox_area']: continue
            if bh > 0:
                hw_ratio = bh / bw  
                if hw_ratio < DETECTION_CONFIG['min_person_ratio']: continue  
                if hw_ratio > DETECTION_CONFIG['max_person_ratio']: continue  

            xyxy.append([x1, y1, x2, y2])
            confidences.append(conf)
            
        if xyxy:
            detections = sv.Detections(
                xyxy=np.array(xyxy),
                confidence=np.array(confidences),
                class_id=np.zeros(len(xyxy), dtype=int)
            )
            tracked_dets = tracker.update_with_detections(detections)
            
            for box, _, conf, _, track_id, *_ in tracked_dets:
                current_tracked_objects.append({
                    'bbox': [int(box[0]), int(box[1]), int(box[2]), int(box[3])],
                    'confidence': float(conf),
                    'id': int(track_id)
                })
    else:
        current_tracked_objects = last_tracked_objects

    detections_pixel = []
    detections_pct = []
    
    for obj in current_tracked_objects:
        x1, y1, x2, y2 = obj['bbox']
        track_id = obj['id']
        pad_w, pad_h = int((x2 - x1) * 0.05), int((y2 - y1) * 0.05)
        px1, py1 = max(0, x1 - pad_w), max(0, y1 - pad_h)
        px2, py2 = min(w, x2 + pad_w), min(h, y2 + pad_h)
        
        detections_pixel.append({'bbox': [px1, py1, px2, py2], 'confidence': obj['confidence'], 'id': track_id})
        detections_pct.append({'bbox': [float(px1)/w, float(py1)/h, float(px2)/w, float(py2)/h], 'confidence': obj['confidence']})

    output_frame = frame_proc
    if annotate and detections_pixel:
        if DETECTION_CONFIG['enable_blur']:
            output_frame = apply_gaussian_blur(output_frame, detections_pixel)
        output_frame = draw_detections_on_frame(output_frame, detections_pixel)

    return output_frame, detections_pct, detections_pixel, current_tracked_objects, (new_results is not None)

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
    
    with STREAM_LOCK:
        THREAD_COUNTS[location_id] = 0
        THREAD_MAX_COUNTS[location_id] = 0

    playback_start_time = time.time()
    last_log_time = time.time() - 61

    tracker_active = sv.ByteTrack(track_activation_threshold=0.25, lost_track_buffer=15, frame_rate=15)
    tracker_background = sv.ByteTrack(track_activation_threshold=0.25, lost_track_buffer=2, frame_rate=1)
    
    last_tracked_objects = []
    track_ages = {}
    last_confirmed_detections = []   
    track_velocities = {}        
    prev_gpu_positions = {}      
    last_gpu_result_time = 0.0   

    display_fps = 30.0 
    last_pipeline_run = 0.0
    was_active = None  

    while True:
        try:
            loop_start = time.time()

            with active_locations_lock:
                is_active = location_id in active_locations

            if was_active is not None and was_active != is_active:
                if is_active:
                    track_ages = {}
                    last_confirmed_detections = []
                    track_velocities = {}
                    prev_gpu_positions = {}
                    last_gpu_result_time = 0.0
                else:
                    last_tracked_objects = []
                    last_confirmed_detections = []
                    track_velocities = {}
                    prev_gpu_positions = {}
                    last_gpu_result_time = 0.0
            was_active = is_active
                
            target_fps = 30.0 
            elapsed = time.time() - playback_start_time
            target_frame = int(elapsed * fps_video)
            current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

            frames_to_skip = target_frame - current_frame
            if frames_to_skip > 0:
                skip_count = min(frames_to_skip, int(fps_video))
                for _ in range(skip_count): cap.grab()

            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                playback_start_time = time.time()
                last_log_time = time.time() - 61
                tracker_active = sv.ByteTrack(track_activation_threshold=0.25, lost_track_buffer=15, frame_rate=15)
                tracker_background = sv.ByteTrack(track_activation_threshold=0.25, lost_track_buffer=2, frame_rate=1)
                last_tracked_objects = []
                track_ages = {}
                last_confirmed_detections = []
                track_velocities = {}
                prev_gpu_positions = {}
                last_gpu_result_time = 0.0
                continue

            now = time.time()
            should_process_ai = is_active or (now - last_pipeline_run >= 5.0)

            with STREAM_LOCK:
                current_count = THREAD_COUNTS.get(location_id, 0)

            if not should_process_ai and not is_active:
                pass  
            elif not should_process_ai and is_active:
                output_frame = frame.copy()
                output_frame = draw_cctv_overlay(output_frame, current_count, display_fps)

                if last_confirmed_detections:
                    render_dets = last_confirmed_detections
                    if last_gpu_result_time > 0:
                        dt = min(time.time() - last_gpu_result_time, 0.2)
                        if dt > 0.01:
                            h_frame, w_frame = frame.shape[:2]
                            interpolated = []
                            for det in render_dets:
                                tid = det['id']
                                if tid in track_velocities:
                                    vx, vy = track_velocities[tid]
                                    dx, dy = int(vx * dt), int(vy * dt)
                                    bx1 = max(0, det['bbox'][0] + dx)
                                    by1 = max(0, det['bbox'][1] + dy)
                                    bx2 = min(w_frame, det['bbox'][2] + dx)
                                    by2 = min(h_frame, det['bbox'][3] + dy)
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
                    with STREAM_LOCK: THREAD_FRAMES[location_id] = buffer.tobytes()
            else:
                loc_config = LOCATION_PIPELINE_CONFIG.get(location_id, DEFAULT_PIPELINE_CONFIG)
                if loc_config['use_clahe']: frame_proc = apply_clahe(frame)
                else: frame_proc = frame

                tracker = tracker_active if is_active else tracker_background
                pipe_frame, detections_pct, detections_pixel, last_tracked_objects, got_fresh = run_yolo_pipeline(
                    frame_proc, frame, location_id, tracker, last_tracked_objects, is_active=is_active, annotate=False
                )

                if got_fresh:
                    confirmed_detections = []
                    current_ids = set()
                    min_age = 3 if is_active else 2

                    for det in detections_pixel:
                        tid = det['id']
                        current_ids.add(tid)
                        track_ages[tid] = track_ages.get(tid, 0) + 1
                        if track_ages[tid] >= min_age: confirmed_detections.append(det)

                    track_ages = {tid: age for tid, age in track_ages.items() if tid in current_ids}

                    # Step 8 fix: Center-point velocity instead of per-corner.
                    # Per-corner velocity caused boxes to stretch because x1 and x2
                    # could drift at different rates.  Center-point velocity translates
                    # the box rigidly — width and height are always preserved.
                    now_gpu = time.time()
                    if last_gpu_result_time > 0:
                        dt_gpu = now_gpu - last_gpu_result_time
                        if 0 < dt_gpu < 2.0:  
                            for det in confirmed_detections:
                                tid = det['id']
                                bbox = det['bbox']
                                cx = (bbox[0] + bbox[2]) / 2.0
                                cy = (bbox[1] + bbox[3]) / 2.0
                                if tid in prev_gpu_positions:
                                    pcx, pcy = prev_gpu_positions[tid]
                                    track_velocities[tid] = (
                                        (cx - pcx) / dt_gpu,
                                        (cy - pcy) / dt_gpu,
                                    )

                    # Store center points for next velocity computation
                    prev_gpu_positions = {}
                    for det in confirmed_detections:
                        bbox = det['bbox']
                        prev_gpu_positions[det['id']] = (
                            (bbox[0] + bbox[2]) / 2.0,
                            (bbox[1] + bbox[3]) / 2.0,
                        )
                    track_velocities = {tid: v for tid, v in track_velocities.items() if tid in current_ids}
                    last_gpu_result_time = now_gpu
                    current_count = len(confirmed_detections)
                    last_confirmed_detections = confirmed_detections
                else:
                    confirmed_detections = last_confirmed_detections
                    if is_active and confirmed_detections and last_gpu_result_time > 0:
                        dt = min(time.time() - last_gpu_result_time, 0.2)  # cap 200ms
                        if dt > 0.01:  
                            h_frame, w_frame = frame.shape[:2]
                            interpolated = []
                            for det in confirmed_detections:
                                tid = det['id']
                                if tid in track_velocities:
                                    vx, vy = track_velocities[tid]
                                    dx, dy = int(vx * dt), int(vy * dt)
                                    bx1 = max(0, det['bbox'][0] + dx)
                                    by1 = max(0, det['bbox'][1] + dy)
                                    bx2 = min(w_frame, det['bbox'][2] + dx)
                                    by2 = min(h_frame, det['bbox'][3] + dy)
                                    if bx2 > bx1 and by2 > by1:
                                        interpolated.append({**det, 'bbox': [bx1, by1, bx2, by2]})
                                    else:
                                        interpolated.append(det)
                                else:
                                    interpolated.append(det)
                            confirmed_detections = interpolated
                    current_count = len(confirmed_detections)

                output_frame = pipe_frame
                if DETECTION_CONFIG['enable_blur'] and confirmed_detections:
                    output_frame = apply_gaussian_blur(output_frame, confirmed_detections)
                if confirmed_detections:
                    output_frame = draw_detections_on_frame(output_frame, confirmed_detections)
                
                last_pipeline_run = now
                output_frame = draw_cctv_overlay(output_frame, current_count, display_fps)


                should_encode = is_active or should_process_ai
                if should_encode:
                    ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    if ret:
                        with STREAM_LOCK: THREAD_FRAMES[location_id] = buffer.tobytes()

            if should_process_ai:
                with STREAM_LOCK:
                    THREAD_COUNTS[location_id] = current_count
                    if current_count > THREAD_MAX_COUNTS[location_id]:
                        THREAD_MAX_COUNTS[location_id] = current_count

            time_since_last_log = time.time() - last_log_time
            with STREAM_LOCK: peak_count = THREAD_MAX_COUNTS.get(location_id, 0)

            high_threshold = LOCATION_HIGH_THRESHOLDS.get(location_id, 10)
            is_high_density = peak_count >= high_threshold

            if time_since_last_log >= 60 or (is_high_density and time_since_last_log >= 10):
                with STREAM_LOCK: THREAD_MAX_COUNTS[location_id] = 0
                
                conf_avg = 1.0 
                if 'detections_pct' in locals() and detections_pct:
                    conf_avg = sum(d['confidence'] for d in detections_pct) / len(detections_pct)
                    
                if log_detection_to_database(app_context, location_id, peak_count, conf_avg):
                    last_log_time = time.time()

            elapsed_this_loop = time.time() - loop_start
            remainder = (1.0 / target_fps) - elapsed_this_loop
            if remainder > 0: time.sleep(remainder)

            final_loop_time = time.time() - loop_start
            true_fps = 1.0 / final_loop_time if final_loop_time > 0 else 30.0
            display_fps = (display_fps * 0.9) + (true_fps * 0.1)
            
        except Exception as e:
            print(f"[VISION] Error in thread for {location_name}: {e}")
            time.sleep(1)

def generate_mjpeg_stream(location_id):
    while True:
        with STREAM_LOCK: frame_data = THREAD_FRAMES.get(location_id)
        if frame_data is None:
            time.sleep(0.1)
            continue
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
        time.sleep(1.0 / 30.0) 

app = Flask(__name__)
CORS(app)

@app.after_request
def brute_force_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/video_feed')
def video_feed():
    loc_id = request.args.get('location_id', type=int)
    if loc_id is None:
        with active_locations_lock: loc_id = next(iter(active_locations), 1)
    return Response(generate_mjpeg_stream(loc_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/live-count', methods=['GET'])
def live_count():
    loc_id = request.args.get('location_id', type=int)
    if loc_id is None:
        with active_locations_lock: loc_id = next(iter(active_locations), 1)
    with STREAM_LOCK: count = THREAD_COUNTS.get(loc_id, 0)
    return jsonify({'count': count, 'location_id': loc_id})

@app.route('/yolo/config', methods=['GET', 'POST'])
def update_yolo_config():
    if request.method == 'GET':
        loc_id = request.args.get('location_id', type=int)
        if loc_id is None:
            with active_locations_lock: 
                loc_id = next(iter(active_locations), 1) if active_locations else 1
        loc_config = LOCATION_PIPELINE_CONFIG.get(loc_id, DEFAULT_PIPELINE_CONFIG)
        return jsonify({
            'enable_clahe': loc_config.get('use_clahe', False),
            'enable_blur': DETECTION_CONFIG.get('enable_blur', True)
        })

    data = request.json
    if 'enable_blur' in data: 
        DETECTION_CONFIG['enable_blur'] = data['enable_blur']
    if 'enable_clahe' in data:
        loc_id = data.get('location_id')
        if loc_id is None:
            with active_locations_lock:
                loc_id = next(iter(active_locations), 1) if active_locations else 1
        if loc_id in LOCATION_PIPELINE_CONFIG:
            LOCATION_PIPELINE_CONFIG[loc_id]['use_clahe'] = data['enable_clahe']
        else:
            DEFAULT_PIPELINE_CONFIG['use_clahe'] = data['enable_clahe']

    return jsonify({'status': 'success', 'config': DETECTION_CONFIG})

@app.route('/device-info', methods=['GET'])
def device_info_route():
    return jsonify(DEVICE_INFO)

@app.route('/set-active-location', methods=['POST'])
def set_active_location():
    data = request.get_json(silent=True) or {}
    new_id = data.get('location_id')
    if not isinstance(new_id, int): return jsonify({'status': 'error', 'message': 'location_id must be an integer'}), 400

    with active_locations_lock:
        was_present = new_id in active_locations
        active_locations[new_id] = time.time()
        now = time.time()
        expired = [lid for lid, ts in active_locations.items() if now - ts > ACTIVE_LOCATION_TIMEOUT]
        for lid in expired: del active_locations[lid]
        if not was_present: print(f"[VISION] Heartbeat: location {new_id} now ACTIVE (total active: {len(active_locations)})")

    if expired:
        try:
            for lid in expired:
                loc = Location.query.get(lid)
                if loc and loc.is_active: loc.is_active = False
            db.session.commit()
            print(f"[VISION] Expired locations {expired} — marked inactive in DB")
        except Exception:
            try: db.session.rollback()
            except Exception: pass

    return jsonify({'status': 'ok', 'active_locations': list(active_locations.keys())})

@app.route('/deactivate-location', methods=['POST'])
def deactivate_location():
    data = request.get_json(silent=True) or {}
    loc_id = data.get('location_id')
    if not isinstance(loc_id, int): return jsonify({'status': 'error', 'message': 'location_id must be an integer'}), 400

    with active_locations_lock:
        if loc_id in active_locations:
            del active_locations[loc_id]
            print(f"[VISION] Location {loc_id} explicitly deactivated (remaining active: {len(active_locations)})")

    try:
        loc = Location.query.get(loc_id)
        if loc and loc.is_active:
            loc.is_active = False
            db.session.commit()
    except Exception as e:
        print(f"[VISION] Warning: failed to deactivate location {loc_id} in DB: {e}")
        try: db.session.rollback()
        except Exception: pass

    return jsonify({'status': 'ok', 'active_locations': list(active_locations.keys())})

def db_polling_thread(app_context):
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
    DEVICE_INFO.update(detect_device())
    print("[VISION] Loading model...")
    try: YOLO_MODEL = load_model(DEVICE_INFO)
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
        
        threading.Thread(target=db_polling_thread, args=(app.app_context,), daemon=True).start()

        now = time.time()
        for loc in locations:
            if loc.is_active: active_locations[loc.id] = now
        if not active_locations and locations: active_locations[locations[0].id] = now
        print(f"[VISION] Seeded active locations: {list(active_locations.keys())}")
        
        for loc in locations:
            if loc.video_filename: INFERENCE_OUTPUT_QUEUES[loc.id] = _queue.Queue(maxsize=1)
        threading.Thread(target=gpu_inference_worker, daemon=True).start()

        for loc in locations:
            if loc.video_filename:
                threading.Thread(
                    target=camera_thread, args=(app.app_context, loc.id, loc.video_filename, loc.name), daemon=True
                ).start()
    
    print("[VISION] Starting Multi-Stream MJPEG Server on port 5002...")
    app.run(host='0.0.0.0', port=5002, debug=False, threaded=True, use_reloader=False)