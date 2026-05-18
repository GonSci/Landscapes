#!/usr/bin/env python3
"""
Vision Worker Service - Multi-Stream Architecture
Processes all locations simultaneously with Adaptive Temporal Slicing (ATS)
and YOLO model sharing for optimal performance.

Replaces SAHI's per-frame sliced inference with a three-tier pipeline:
  Tier 1: Plain YOLO + hotspot ROIs (fastest, ~80-90% of frames)
  Tier 2: ROI slicing on changed regions (medium, ~5-15%)
  Tier 3: Full tiled inference (slowest, ~5-10%, calibration keyframes)
"""

import os
import cv2
import numpy as np
import torch
import torchvision
from ultralytics import YOLO
import threading
import time
from datetime import datetime
from dotenv import load_dotenv
import math

from extensions import db
from models import Location, SurveillanceLog
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from collections import OrderedDict

load_dotenv()

# ── Tracking ───────────────────────────────────────────────────────────────────
class CentroidTracker:
    def __init__(self, max_disappeared=15, max_distance=100):
        self.next_object_id = 0
        self.objects = OrderedDict()
        self.disappeared = OrderedDict()
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        self.cumulative_count = 0

    def register(self, centroid):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.next_object_id += 1
        self.cumulative_count += 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]

    def update(self, rects):
        if len(rects) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects

        input_centroids = np.zeros((len(rects), 2), dtype="int")
        for (i, (startX, startY, endX, endY)) in enumerate(rects):
            cX = int((startX + endX) / 2.0)
            cY = int((startY + endY) / 2.0)
            input_centroids[i] = (cX, cY)

        if len(self.objects) == 0:
            for i in range(0, len(input_centroids)):
                self.register(input_centroids[i])
        else:
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())

            D = np.zeros((len(object_centroids), len(input_centroids)))
            for i in range(len(object_centroids)):
                for j in range(len(input_centroids)):
                    D[i, j] = math.hypot(object_centroids[i][0] - input_centroids[j][0], 
                                         object_centroids[i][1] - input_centroids[j][1])

            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                if D[row, col] > self.max_distance:
                    continue

                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0
                used_rows.add(row)
                used_cols.add(col)

            unused_rows = set(range(0, D.shape[0])).difference(used_rows)
            unused_cols = set(range(0, D.shape[1])).difference(used_cols)

            for row in unused_rows:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)

            for col in unused_cols:
                self.register(input_centroids[col])

        return self.objects

# ── Device Auto-Detection ─────────────────────────────────────────────────────
def _select_device():
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    return "cpu"

DEVICE = _select_device()

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'conf_threshold': 0.5,
    'iou_threshold': 0.45,
    'use_gpu': True,
    'enable_clahe': True,
    'enable_blur': True,
    'show_boxes': True,
    # Adaptive Temporal Slicing parameters
    'keyframe_interval': 30,
    'change_threshold': 0.02,
    'tile_size': 640,
    'tile_overlap': 0.15,
    'discrepancy_ratio': 0.5,
    'hotspot_min_detections': 3,
    # Occlusion-Aware Head Detection (dual-pass)
    'enable_head_detection': True,
    'head_conf_threshold': 0.25,     # Lower conf for tiled pass to catch occluded/small
    'head_tile_size': 640,
}

YOLO_MODEL = None
YOLO_LOCK = threading.Lock()  # Thread-safe GPU/model access

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
        source = det.get('source', 'body')
        # Green for body detections, Cyan for head/occlusion detections
        color = (255, 255, 0) if source == 'head' else (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        label = f"Person {confidence:.2f}" if source == 'body' else f"Occluded {confidence:.2f}"
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


# ── Adaptive Temporal Slicing Detector ─────────────────────────────────────────
class AdaptiveDetector:
    """
    Three-tier detection pipeline with density feedback loop.
    Replaces SAHI's uniform per-frame sliced inference.
    """

    def __init__(self, model, config, inference_lock):
        self.model = model
        self.config = config
        self.inference_lock = inference_lock
        # Per-thread state
        self.frame_counter = 0
        self.last_gray = None
        self.hotspot_rois = []
        self.last_tier3_count = 0
        self.tier_stats = {1: 0, 2: 0, 3: 0}
        self.cached_occlusion_dets = []  # Cached occlusion dets reused on Tier 1/2 frames

    def detect(self, frame, annotate=True):
        """Main entry point — decides tier, runs detection, returns results."""
        start_time = time.time()
        frame_proc = apply_clahe(frame) if self.config['enable_clahe'] else frame.copy()

        self.frame_counter += 1
        is_keyframe = (self.frame_counter % self.config['keyframe_interval'] == 0)

        if is_keyframe:
            raw_dets = self._tier3_full_slicing(frame_proc)
            tier_used = 3
            # Occlusion pass runs on keyframes only — cache for T1/T2 reuse
            if self.config['enable_head_detection']:
                raw_dets = self._fuse_body_head(frame_proc, raw_dets)
                self.cached_occlusion_dets = [d for d in raw_dets if d.get('source') == 'head']
        else:
            change_mask, change_ratio = self._compute_change_mask(frame_proc)

            if change_ratio > self.config['change_threshold']:
                raw_dets = self._tier2_roi_slicing(frame_proc, change_mask)
                tier_used = 2
            else:
                raw_dets = self._tier1_plain_with_hotspots(frame_proc)
                tier_used = 1
                # Count discrepancy check — force Tier 3 + occlusion pass
                if self._has_count_discrepancy(len(raw_dets)):
                    raw_dets = self._tier3_full_slicing(frame_proc)
                    tier_used = 3
                    if self.config['enable_head_detection']:
                        raw_dets = self._fuse_body_head(frame_proc, raw_dets)
                        self.cached_occlusion_dets = [d for d in raw_dets if d.get('source') == 'head']

            # Merge cached occlusion dets into T1/T2 results (no extra inference cost)
            if self.config['enable_head_detection'] and self.cached_occlusion_dets:
                for det in raw_dets:
                    det['source'] = 'body'
                raw_dets = self._merge_detections(raw_dets + self.cached_occlusion_dets)

        self.tier_stats[tier_used] += 1

        # Filter oversized / full-frame false positives
        h, w = frame.shape[:2]
        detections_pixel = []
        detections_pct = []
        for det in raw_dets:
            x1, y1, x2, y2 = det['bbox']
            conf = det['confidence']
            bw, bh = x2 - x1, y2 - y1
            if bw > (w * 0.6) or bh > (h * 0.6):
                continue
            if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
                continue
            detections_pixel.append({'bbox': [int(x1), int(y1), int(x2), int(y2)], 'confidence': conf, 'source': det.get('source', 'body')})
            detections_pct.append({
                'bbox': [float(x1)/w, float(y1)/h, float(x2)/w, float(y2)/h],
                'confidence': conf, 'source': det.get('source', 'body')
            })

        # Annotate
        output_frame = frame.copy()
        if annotate and detections_pixel:
            if self.config['enable_blur']:
                output_frame = apply_gaussian_blur(output_frame, detections_pixel)
            if self.config['show_boxes']:
                output_frame = draw_detections_on_frame(output_frame, detections_pixel)

        fps = 1.0 / max(time.time() - start_time, 0.001)

        # Periodic tier stats logging
        total = sum(self.tier_stats.values())
        if total > 0 and total % 50 == 0:
            pcts = {k: f"{v/total*100:.0f}%" for k, v in self.tier_stats.items()}
            print(f"[ATS] Tier distribution: T1={pcts[1]}, T2={pcts[2]}, T3={pcts[3]} (n={total})")

        return output_frame, detections_pct, detections_pixel, fps

    # ── Inference Helpers ──────────────────────────────────────────────────────
    def _run_yolo(self, image):
        """Thread-safe YOLO inference at normal confidence. Returns list of detection dicts."""
        return self._run_yolo_at_conf(image, self.config['conf_threshold'])

    def _run_yolo_lowconf(self, image):
        """Thread-safe YOLO inference at low confidence for occlusion detection."""
        return self._run_yolo_at_conf(image, self.config['head_conf_threshold'])

    def _run_yolo_at_conf(self, image, conf):
        """Thread-safe YOLO inference at specified confidence."""
        with self.inference_lock:
            results = self.model.predict(
                image,
                conf=conf,
                iou=self.config['iou_threshold'],
                classes=[0],
                verbose=False,
                half=True, # Use FP16 precision
            )
        dets = []
        if results and len(results) > 0 and results[0].boxes is not None:
            for box in results[0].boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                c = float(box.conf[0].cpu().numpy())
                dets.append({'bbox': [float(x1), float(y1), float(x2), float(y2)], 'confidence': c})
        return dets

    # ── Occlusion-Aware Dual-Pass Fusion ──────────────────────────────────────
    def _fuse_body_head(self, frame, body_dets):
        """
        Run a second tiled pass at lower confidence to catch partially
        occluded and distant people missed by the primary detection.
        Unmatched low-conf detections are marked as 'head' source.
        """
        h, w = frame.shape[:2]
        tile_size = self.config['head_tile_size']
        stride = int(tile_size * (1 - self.config['tile_overlap']))

        head_dets = []
        for y in range(0, h, stride):
            for x in range(0, w, stride):
                x2 = min(x + tile_size, w)
                y2 = min(y + tile_size, h)
                x1 = max(0, x2 - tile_size)
                y1 = max(0, y2 - tile_size)
                tile = frame[y1:y2, x1:x2]
                if tile.size == 0:
                    continue
                for det in self._run_yolo_lowconf(tile):
                    bx1, by1, bx2, by2 = det['bbox']
                    det['bbox'] = [bx1 + x1, by1 + y1, bx2 + x1, by2 + y1]
                    head_dets.append(det)

        if not head_dets:
            return body_dets

        # Mark body dets with source
        for det in body_dets:
            det['source'] = 'body'

        # Find head dets that do NOT overlap with any body det
        unmatched = []
        for hd in head_dets:
            hcx = (hd['bbox'][0] + hd['bbox'][2]) / 2
            hcy = (hd['bbox'][1] + hd['bbox'][3]) / 2
            matched = False
            for bd in body_dets:
                bx1, by1, bx2, by2 = bd['bbox']
                # Check if head center falls inside body box (with 20% margin)
                margin_x = (bx2 - bx1) * 0.2
                margin_y = (by2 - by1) * 0.2
                if (bx1 - margin_x) <= hcx <= (bx2 + margin_x) and \
                   (by1 - margin_y) <= hcy <= (by2 + margin_y):
                    matched = True
                    break
            if not matched:
                hd['source'] = 'head'
                unmatched.append(hd)

        # NMS among unmatched heads only (avoid duplicates between tiles)
        if unmatched:
            unmatched = self._merge_detections(unmatched)

        return body_dets + unmatched

    # ── Tier 1: Plain YOLO + Hotspot ROIs ──────────────────────────────────────
    def _tier1_plain_with_hotspots(self, frame):
        all_dets = self._run_yolo(frame)
        h, w = frame.shape[:2]

        for roi in self.hotspot_rois:
            rx1, ry1, rx2, ry2 = roi
            rx1, ry1 = max(0, rx1), max(0, ry1)
            rx2, ry2 = min(w, rx2), min(h, ry2)
            crop = frame[ry1:ry2, rx1:rx2]
            if crop.size == 0:
                continue
            for det in self._run_yolo(crop):
                bx1, by1, bx2, by2 = det['bbox']
                det['bbox'] = [bx1 + rx1, by1 + ry1, bx2 + rx1, by2 + ry1]
                all_dets.append(det)

        return self._merge_detections(all_dets) if all_dets else []

    # ── Tier 2: ROI Slicing on Changed Regions ─────────────────────────────────
    def _tier2_roi_slicing(self, frame, change_mask):
        h, w = frame.shape[:2]
        contours, _ = cv2.findContours(change_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        rois = []
        min_area = (w * h) * 0.01
        pad = 50
        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            if cw * ch < min_area:
                continue
            rois.append([max(0, x - pad), max(0, y - pad), min(w, x + cw + pad), min(h, y + ch + pad)])

        if not rois:
            return self._run_yolo(frame)

        all_dets = self._run_yolo(frame)  # baseline full-frame
        for rx1, ry1, rx2, ry2 in rois:
            crop = frame[ry1:ry2, rx1:rx2]
            if crop.size == 0:
                continue
            for det in self._run_yolo(crop):
                bx1, by1, bx2, by2 = det['bbox']
                det['bbox'] = [bx1 + rx1, by1 + ry1, bx2 + rx1, by2 + ry1]
                all_dets.append(det)

        return self._merge_detections(all_dets) if all_dets else []

    # ── Tier 3: Full Tiled Inference ───────────────────────────────────────────
    def _tier3_full_slicing(self, frame):
        h, w = frame.shape[:2]
        tile_size = self.config['tile_size']
        stride = int(tile_size * (1 - self.config['tile_overlap']))

        all_dets = self._run_yolo(frame)  # full-frame baseline

        for y in range(0, h, stride):
            for x in range(0, w, stride):
                x2 = min(x + tile_size, w)
                y2 = min(y + tile_size, h)
                x1 = max(0, x2 - tile_size)
                y1 = max(0, y2 - tile_size)
                tile = frame[y1:y2, x1:x2]
                if tile.size == 0:
                    continue
                for det in self._run_yolo(tile):
                    bx1, by1, bx2, by2 = det['bbox']
                    det['bbox'] = [bx1 + x1, by1 + y1, bx2 + x1, by2 + y1]
                    all_dets.append(det)

        all_dets = self._merge_detections(all_dets) if all_dets else []

        # Update hotspot memory
        self.last_tier3_count = len(all_dets)
        self.hotspot_rois = self._extract_hotspots(all_dets, (h, w))
        if self.hotspot_rois:
            print(f"[ATS] Tier 3: {len(all_dets)} people, {len(self.hotspot_rois)} hotspot ROIs")

        return all_dets

    # ── Scene Change Detection ─────────────────────────────────────────────────
    def _compute_change_mask(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if self.last_gray is None:
            self.last_gray = gray
            return np.zeros_like(gray), 1.0

        diff = cv2.absdiff(self.last_gray, gray)
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        thresh = cv2.dilate(thresh, kernel, iterations=2)

        change_ratio = np.count_nonzero(thresh) / thresh.size
        self.last_gray = gray
        return thresh, change_ratio

    # ── Hotspot Extraction ─────────────────────────────────────────────────────
    def _extract_hotspots(self, detections, frame_shape):
        if len(detections) < self.config['hotspot_min_detections']:
            return []

        h, w = frame_shape
        grid = self.config['tile_size']
        cells = {}
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            key = (int((x1 + x2) / 2 // grid), int((y1 + y2) / 2 // grid))
            cells.setdefault(key, []).append(det)

        hotspots = []
        pad = int(grid * 0.2)
        for cell_dets in cells.values():
            if len(cell_dets) >= self.config['hotspot_min_detections']:
                ax1 = min(d['bbox'][0] for d in cell_dets)
                ay1 = min(d['bbox'][1] for d in cell_dets)
                ax2 = max(d['bbox'][2] for d in cell_dets)
                ay2 = max(d['bbox'][3] for d in cell_dets)
                hotspots.append([int(max(0, ax1 - pad)), int(max(0, ay1 - pad)),
                                 int(min(w, ax2 + pad)), int(min(h, ay2 + pad))])
        return hotspots

    # ── Count Discrepancy Check ────────────────────────────────────────────────
    def _has_count_discrepancy(self, current_count):
        return (self.last_tier3_count > 5 and
                current_count < self.config['discrepancy_ratio'] * self.last_tier3_count)

    # ── NMS Merge ──────────────────────────────────────────────────────────────
    def _merge_detections(self, detections):
        if not detections:
            return []
        boxes = torch.tensor([d['bbox'] for d in detections], dtype=torch.float32)
        scores = torch.tensor([d['confidence'] for d in detections], dtype=torch.float32)
        keep = torchvision.ops.nms(boxes, scores, self.config['iou_threshold'])
        return [detections[i] for i in keep.tolist()]

    def get_tier_stats(self):
        total = sum(self.tier_stats.values())
        if total == 0:
            return {1: "0%", 2: "0%", 3: "0%"}
        return {k: f"{v/total*100:.1f}%" for k, v in self.tier_stats.items()}


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
    
    # Fetch location details (capacity) from DB
    with app_context():
        loc = Location.query.get(location_id)
        max_capacity = loc.max_capacity if loc else 100
        print(f"[VISION] {location_name} - Max Capacity: {max_capacity}")

    # Create per-thread adaptive detector and tracker
    detector = AdaptiveDetector(YOLO_MODEL, DETECTION_CONFIG, YOLO_LOCK)
    tracker = CentroidTracker(max_disappeared=15, max_distance=150)
    last_logged_cumulative = 0

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

            # 2. Process frame with adaptive detector
            output_frame, detections_pct, detections_pixel, fps = detector.detect(frame, annotate=True)
            
            # Extract bounding boxes and update tracking
            rects = [d['bbox'] for d in detections_pixel]
            tracker.update(rects)
            
            current_count = len(detections_pixel)
            
            # Log cumulative count to terminal if it changed
            if tracker.cumulative_count > last_logged_cumulative:
                print(f"[VISION] {location_name} - Cumulative People Detected: {tracker.cumulative_count}")
                last_logged_cumulative = tracker.cumulative_count

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

            # 4. Database Logging (Every 60s or on Capacity Spike)
            now = time.time()
            time_since_last_log = now - last_log_time

            with STREAM_LOCK:
                peak_count = THREAD_MAX_COUNTS[location_id]

            # Spike detection: Count has reached or exceeded max capacity
            is_capacity_spike = peak_count >= max_capacity

            # Log conditions:
            # - 60 seconds have passed (Interval Log)
            # - Capacity reached and at least 10 seconds since last log (Spike Log)
            if time_since_last_log >= 60 or (is_capacity_spike and time_since_last_log >= 10):
                if is_capacity_spike and time_since_last_log < 60:
                    print(f"[VISION] SPIKE DETECTED at {location_name}: {peak_count} people (Capacity: {max_capacity})")
                
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
    if 'show_boxes' in data: DETECTION_CONFIG['show_boxes'] = data['show_boxes']
    if 'enable_head_detection' in data: DETECTION_CONFIG['enable_head_detection'] = data['enable_head_detection']
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
    print(f"[VISION] Loading YOLOv8 model on {DEVICE}...")
    YOLO_MODEL = YOLO('best.pt')
    YOLO_MODEL.to(DEVICE)
    print(f"[VISION] Model loaded successfully on {DEVICE}")
    
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
    
    print("[VISION] Starting Multi-Stream MJPEG Server on port 5003...")
    app.run(host='0.0.0.0', port=5003, debug=False, threaded=True, use_reloader=False)
