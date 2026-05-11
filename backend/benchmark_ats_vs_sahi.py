#!/usr/bin/env python3
"""
Benchmark: Adaptive Temporal Slicing (Tier 3) vs Full SAHI
==========================================================
Runs both pipelines on the same sampled frames from all available videos
and compares:
  - MAE  (Mean Absolute Error of people counts)
  - mAP  (mean Average Precision of detection overlap via IoU matching)
  - Speed (avg inference time per frame)

SAHI is treated as the reference baseline.
"""

import os, sys, time, json, cv2
import numpy as np
import torch
import torchvision
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction
from datetime import datetime

# ── Configuration ─────────────────────────────────────────────────────────────
CONF_THRESHOLD = 0.5
IOU_THRESHOLD  = 0.45
TILE_SIZE      = 640
TILE_OVERLAP   = 0.15
SAMPLE_FRAMES  = 30        # frames to sample per video
FRAME_SKIP     = 30        # sample every Nth frame
IOU_MATCH_THRESHOLD = 0.5  # IoU threshold for mAP matching

VIDEO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         'frontend', 'public', 'assets')

def select_device():
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    return "cpu"

DEVICE = select_device()

# ── SAHI Pipeline (Reference) ─────────────────────────────────────────────────
def run_sahi(frame, sahi_model):
    """Full SAHI sliced prediction — the old pipeline."""
    results = get_sliced_prediction(
        frame, sahi_model,
        slice_height=TILE_SIZE, slice_width=TILE_SIZE,
        overlap_height_ratio=TILE_OVERLAP, overlap_width_ratio=TILE_OVERLAP,
        postprocess_match_metric="IOU",
        postprocess_match_threshold=IOU_THRESHOLD,
        postprocess_class_agnostic=True,
        verbose=False
    )
    dets = []
    for obj in results.object_prediction_list:
        if obj.category.id != 0:
            continue
        x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
        conf = obj.score.value
        h, w = frame.shape[:2]
        bw, bh = x2 - x1, y2 - y1
        if bw > (w * 0.6) or bh > (h * 0.6):
            continue
        if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
            continue
        dets.append({'bbox': [float(x1), float(y1), float(x2), float(y2)], 'confidence': conf})
    return dets

# ── ATS Tier 3 Pipeline (New) ─────────────────────────────────────────────────
def run_tier3(frame, yolo_model):
    """Manual tiled inference matching the AdaptiveDetector._tier3_full_slicing logic."""
    h, w = frame.shape[:2]
    stride = int(TILE_SIZE * (1 - TILE_OVERLAP))

    # Full-frame baseline
    all_dets = _run_yolo_native(frame, yolo_model)

    # Tiled inference
    for y in range(0, h, stride):
        for x in range(0, w, stride):
            x2 = min(x + TILE_SIZE, w)
            y2 = min(y + TILE_SIZE, h)
            x1 = max(0, x2 - TILE_SIZE)
            y1 = max(0, y2 - TILE_SIZE)
            tile = frame[y1:y2, x1:x2]
            if tile.size == 0:
                continue
            for det in _run_yolo_native(tile, yolo_model):
                bx1, by1, bx2, by2 = det['bbox']
                det['bbox'] = [bx1 + x1, by1 + y1, bx2 + x1, by2 + y1]
                all_dets.append(det)

    # NMS merge
    all_dets = _nms_merge(all_dets)

    # Filter oversized
    filtered = []
    for det in all_dets:
        x1, y1, x2, y2 = det['bbox']
        bw, bh = x2 - x1, y2 - y1
        if bw > (w * 0.6) or bh > (h * 0.6):
            continue
        if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
            continue
        filtered.append(det)
    return filtered

def _run_yolo_native(image, model):
    results = model.predict(
        image, conf=CONF_THRESHOLD, iou=IOU_THRESHOLD,
        classes=[0], verbose=False
    )
    dets = []
    if results and len(results) > 0 and results[0].boxes is not None:
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            dets.append({'bbox': [float(x1), float(y1), float(x2), float(y2)], 'confidence': conf})
    return dets

def _nms_merge(detections):
    if not detections:
        return []
    boxes = torch.tensor([d['bbox'] for d in detections], dtype=torch.float32)
    scores = torch.tensor([d['confidence'] for d in detections], dtype=torch.float32)
    keep = torchvision.ops.nms(boxes, scores, IOU_THRESHOLD)
    return [detections[i] for i in keep.tolist()]

# ── mAP Calculation ───────────────────────────────────────────────────────────
def compute_iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0

def compute_ap(ref_dets, pred_dets, iou_threshold=0.5):
    """
    Compute Average Precision treating ref_dets (SAHI) as ground truth
    and pred_dets (Tier 3) as predictions.
    """
    if not ref_dets and not pred_dets:
        return 1.0  # both empty = perfect
    if not ref_dets:
        return 0.0  # false positives only
    if not pred_dets:
        return 0.0  # missed everything

    # Sort predictions by confidence (descending)
    preds_sorted = sorted(pred_dets, key=lambda d: d['confidence'], reverse=True)
    matched_ref = set()

    tp = []
    fp = []
    for pred in preds_sorted:
        best_iou = 0
        best_idx = -1
        for i, ref in enumerate(ref_dets):
            if i in matched_ref:
                continue
            iou = compute_iou(pred['bbox'], ref['bbox'])
            if iou > best_iou:
                best_iou = iou
                best_idx = i

        if best_iou >= iou_threshold and best_idx >= 0:
            tp.append(1)
            fp.append(0)
            matched_ref.add(best_idx)
        else:
            tp.append(0)
            fp.append(1)

    tp_cumsum = np.cumsum(tp)
    fp_cumsum = np.cumsum(fp)
    recall = tp_cumsum / len(ref_dets)
    precision = tp_cumsum / (tp_cumsum + fp_cumsum)

    # AP via 11-point interpolation
    ap = 0
    for t in np.arange(0, 1.1, 0.1):
        mask = recall >= t
        if mask.any():
            ap += precision[mask].max()
    ap /= 11.0
    return ap

# ── Main Benchmark ────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("  BENCHMARK: ATS Tier 3 vs Full SAHI")
    print(f"  Device: {DEVICE} | Conf: {CONF_THRESHOLD} | IoU: {IOU_THRESHOLD}")
    print(f"  Tile: {TILE_SIZE}×{TILE_SIZE} | Overlap: {TILE_OVERLAP}")
    print(f"  Sampling: {SAMPLE_FRAMES} frames/video (every {FRAME_SKIP}th frame)")
    print("=" * 70)

    # Load models
    print("\n[1/3] Loading models...")
    yolo_model = YOLO('best.pt')
    yolo_model.to(DEVICE)
    print(f"  ✓ Native YOLO on {DEVICE}")

    sahi_model = AutoDetectionModel.from_pretrained(
        model_type='yolov8', model_path='best.pt',
        confidence_threshold=CONF_THRESHOLD, device="cpu"
    )
    print("  ✓ SAHI model on cpu")

    # Find videos
    videos = [f for f in os.listdir(VIDEO_DIR) if f.endswith('.mp4')]
    if not videos:
        print("  ✗ No videos found!")
        return
    print(f"  ✓ Found {len(videos)} videos: {', '.join(videos)}")

    # Run benchmark
    print(f"\n[2/3] Running benchmark...")
    all_results = []

    for vid_name in videos:
        vid_path = os.path.join(VIDEO_DIR, vid_name)
        cap = cv2.VideoCapture(vid_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"\n  ── {vid_name} ({total_frames} total frames) ──")

        vid_counts_sahi = []
        vid_counts_tier3 = []
        vid_aps = []
        vid_time_sahi = []
        vid_time_tier3 = []

        sampled = 0
        frame_idx = 0
        while sampled < SAMPLE_FRAMES:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            # SAHI
            t0 = time.time()
            sahi_dets = run_sahi(frame, sahi_model)
            sahi_time = time.time() - t0

            # ATS Tier 3
            t0 = time.time()
            tier3_dets = run_tier3(frame, yolo_model)
            tier3_time = time.time() - t0

            # Metrics
            sahi_count = len(sahi_dets)
            tier3_count = len(tier3_dets)
            ap = compute_ap(sahi_dets, tier3_dets, IOU_MATCH_THRESHOLD)

            vid_counts_sahi.append(sahi_count)
            vid_counts_tier3.append(tier3_count)
            vid_aps.append(ap)
            vid_time_sahi.append(sahi_time)
            vid_time_tier3.append(tier3_time)

            sampled += 1
            frame_idx += FRAME_SKIP
            print(f"    Frame {frame_idx:5d}: SAHI={sahi_count:3d} | Tier3={tier3_count:3d} | "
                  f"AP={ap:.3f} | SAHI {sahi_time:.2f}s | Tier3 {tier3_time:.2f}s")

        cap.release()

        if not vid_counts_sahi:
            continue

        # Per-video summary
        mae = np.mean(np.abs(np.array(vid_counts_sahi) - np.array(vid_counts_tier3)))
        mape = np.mean(np.abs(np.array(vid_counts_sahi) - np.array(vid_counts_tier3)) /
                        np.maximum(np.array(vid_counts_sahi), 1)) * 100
        m_ap = np.mean(vid_aps)
        avg_sahi_t = np.mean(vid_time_sahi)
        avg_tier3_t = np.mean(vid_time_tier3)
        speedup = avg_sahi_t / avg_tier3_t if avg_tier3_t > 0 else 0

        vid_result = {
            'video': vid_name,
            'frames_sampled': sampled,
            'mae': round(mae, 2),
            'mape': round(mape, 1),
            'map': round(m_ap, 4),
            'avg_sahi_count': round(np.mean(vid_counts_sahi), 1),
            'avg_tier3_count': round(np.mean(vid_counts_tier3), 1),
            'avg_sahi_time': round(avg_sahi_t, 3),
            'avg_tier3_time': round(avg_tier3_t, 3),
            'speedup': round(speedup, 2),
        }
        all_results.append(vid_result)
        print(f"    ─ MAE: {mae:.2f} | MAPE: {mape:.1f}% | mAP: {m_ap:.4f} | "
              f"Speedup: {speedup:.2f}×")

    # ── Summary ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  RESULTS SUMMARY")
    print("=" * 70)
    print(f"\n  {'Video':<25} {'MAE':>6} {'MAPE':>7} {'mAP':>7} {'SAHI(s)':>8} {'Tier3(s)':>9} {'Speedup':>8}")
    print("  " + "-" * 68)

    total_mae, total_mape, total_map = [], [], []
    total_sahi_t, total_tier3_t = [], []

    for r in all_results:
        print(f"  {r['video']:<25} {r['mae']:>6.2f} {r['mape']:>6.1f}% {r['map']:>7.4f} "
              f"{r['avg_sahi_time']:>8.3f} {r['avg_tier3_time']:>9.3f} {r['speedup']:>7.2f}×")
        total_mae.append(r['mae'])
        total_mape.append(r['mape'])
        total_map.append(r['map'])
        total_sahi_t.append(r['avg_sahi_time'])
        total_tier3_t.append(r['avg_tier3_time'])

    print("  " + "-" * 68)
    if total_mae:
        overall_speedup = np.mean(total_sahi_t) / np.mean(total_tier3_t) if np.mean(total_tier3_t) > 0 else 0
        print(f"  {'OVERALL':<25} {np.mean(total_mae):>6.2f} {np.mean(total_mape):>6.1f}% "
              f"{np.mean(total_map):>7.4f} {np.mean(total_sahi_t):>8.3f} "
              f"{np.mean(total_tier3_t):>9.3f} {overall_speedup:>7.2f}×")

    print(f"\n  Interpretation:")
    print(f"    MAE  = Mean Absolute Error in people count (lower is better)")
    print(f"    MAPE = Mean Absolute Percentage Error (lower is better)")
    print(f"    mAP  = Mean Average Precision vs SAHI detections (higher is better)")
    print(f"           1.0 = perfect match, >0.8 = excellent, >0.6 = good")
    print(f"    Speedup = how much faster Tier 3 is vs SAHI on same hardware")
    print()

    # Save results
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'benchmark_results.json')
    with open(out_path, 'w') as f:
        json.dump({'timestamp': datetime.now().isoformat(), 'device': DEVICE,
                   'config': {'conf': CONF_THRESHOLD, 'iou': IOU_THRESHOLD,
                              'tile_size': TILE_SIZE, 'overlap': TILE_OVERLAP},
                   'results': all_results}, f, indent=2)
    print(f"  Results saved to {out_path}")

if __name__ == '__main__':
    main()
