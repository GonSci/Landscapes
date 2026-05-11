#!/usr/bin/env python3
"""
Benchmark: Crowd Density & Cluster Accuracy — ATS Tier 3 vs SAHI
================================================================
Evaluates spatial accuracy beyond raw counts:
  1. Density Grid Correlation — divide frame into cells, compare people/cell
  2. Cluster Detection — DBSCAN on detection centers, compare clusters found
  3. Heatmap MAE — pixel-level density map comparison
"""

import os, sys, time, json, cv2
import numpy as np
import torch, torchvision
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction
from sklearn.cluster import DBSCAN
from scipy.optimize import linear_sum_assignment
from scipy.spatial.distance import cdist
from datetime import datetime

CONF, IOU = 0.5, 0.45
TILE, OVERLAP = 640, 0.15
SAMPLE_FRAMES, FRAME_SKIP = 20, 45
GRID_CELLS = 6  # 6x6 density grid
DBSCAN_EPS = 80  # pixels — cluster radius
DBSCAN_MIN = 2   # min people for a cluster

VIDEO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         'frontend', 'public', 'assets')

def select_device():
    if torch.backends.mps.is_available(): return "mps"
    if torch.cuda.is_available(): return "cuda"
    return "cpu"

DEVICE = select_device()

# ── Detection Pipelines ───────────────────────────────────────────────────────
def run_sahi(frame, model):
    results = get_sliced_prediction(
        frame, model, slice_height=TILE, slice_width=TILE,
        overlap_height_ratio=OVERLAP, overlap_width_ratio=OVERLAP,
        postprocess_match_metric="IOU", postprocess_match_threshold=IOU,
        postprocess_class_agnostic=True, verbose=False)
    dets = []
    h, w = frame.shape[:2]
    for obj in results.object_prediction_list:
        if obj.category.id != 0: continue
        x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
        bw, bh = x2 - x1, y2 - y1
        if bw > w * 0.6 or bh > h * 0.6: continue
        dets.append({'bbox': [float(x1), float(y1), float(x2), float(y2)],
                     'confidence': obj.score.value})
    return dets

def _yolo_infer(image, model):
    results = model.predict(image, conf=CONF, iou=IOU, classes=[0], verbose=False)
    dets = []
    if results and results[0].boxes is not None:
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            dets.append({'bbox': [float(x1), float(y1), float(x2), float(y2)],
                         'confidence': float(box.conf[0].cpu())})
    return dets

def _nms(dets):
    if not dets: return []
    boxes = torch.tensor([d['bbox'] for d in dets], dtype=torch.float32)
    scores = torch.tensor([d['confidence'] for d in dets], dtype=torch.float32)
    keep = torchvision.ops.nms(boxes, scores, IOU)
    return [dets[i] for i in keep.tolist()]

def run_tier3(frame, model):
    h, w = frame.shape[:2]
    stride = int(TILE * (1 - OVERLAP))
    all_dets = _yolo_infer(frame, model)
    for y in range(0, h, stride):
        for x in range(0, w, stride):
            x2, y2 = min(x + TILE, w), min(y + TILE, h)
            x1, y1 = max(0, x2 - TILE), max(0, y2 - TILE)
            tile = frame[y1:y2, x1:x2]
            if tile.size == 0: continue
            for d in _yolo_infer(tile, model):
                bx1, by1, bx2, by2 = d['bbox']
                d['bbox'] = [bx1+x1, by1+y1, bx2+x1, by2+y1]
                all_dets.append(d)
    all_dets = _nms(all_dets)
    filtered = []
    for d in all_dets:
        bx1, by1, bx2, by2 = d['bbox']
        if (bx2-bx1) > w*0.6 or (by2-by1) > h*0.6: continue
        filtered.append(d)
    return filtered

# ── Analysis Functions ─────────────────────────────────────────────────────────
def get_centers(dets):
    return np.array([[(d['bbox'][0]+d['bbox'][2])/2, (d['bbox'][1]+d['bbox'][3])/2]
                     for d in dets]) if dets else np.empty((0, 2))

def density_grid(centers, h, w, cells=GRID_CELLS):
    grid = np.zeros((cells, cells))
    if len(centers) == 0: return grid
    cell_w, cell_h = w / cells, h / cells
    for cx, cy in centers:
        gi, gj = min(int(cy / cell_h), cells-1), min(int(cx / cell_w), cells-1)
        grid[gi][gj] += 1
    return grid

def density_heatmap(centers, h, w, sigma=40):
    hmap = np.zeros((h, w), dtype=np.float32)
    for cx, cy in centers:
        x, y = int(cx), int(cy)
        y1, y2 = max(0, y - sigma*3), min(h, y + sigma*3)
        x1, x2 = max(0, x - sigma*3), min(w, x + sigma*3)
        yy, xx = np.mgrid[y1:y2, x1:x2]
        hmap[y1:y2, x1:x2] += np.exp(-((xx-x)**2 + (yy-y)**2) / (2*sigma**2))
    return hmap

def cluster_dets(centers):
    if len(centers) < DBSCAN_MIN: return [], []
    db = DBSCAN(eps=DBSCAN_EPS, min_samples=DBSCAN_MIN).fit(centers)
    labels = db.labels_
    clusters = []
    for cid in set(labels):
        if cid == -1: continue
        mask = labels == cid
        pts = centers[mask]
        clusters.append({'centroid': pts.mean(axis=0), 'size': len(pts),
                         'bbox': [pts[:,0].min(), pts[:,1].min(), pts[:,0].max(), pts[:,1].max()]})
    return clusters, labels

def match_clusters(ref_clusters, pred_clusters):
    if not ref_clusters and not pred_clusters: return 1.0, 0.0, []
    if not ref_clusters or not pred_clusters: return 0.0, 0.0, []
    ref_c = np.array([c['centroid'] for c in ref_clusters])
    pred_c = np.array([c['centroid'] for c in pred_clusters])
    cost = cdist(ref_c, pred_c, 'euclidean')
    ri, ci = linear_sum_assignment(cost)
    matches = []
    matched_dist = []
    for r, c in zip(ri, ci):
        if cost[r, c] < DBSCAN_EPS * 2:
            matches.append((r, c, cost[r, c],
                            ref_clusters[r]['size'], pred_clusters[c]['size']))
            matched_dist.append(cost[r, c])
    precision = len(matches) / len(pred_clusters) if pred_clusters else 0
    recall = len(matches) / len(ref_clusters) if ref_clusters else 0
    f1 = 2*precision*recall/(precision+recall) if (precision+recall) > 0 else 0
    avg_dist = np.mean(matched_dist) if matched_dist else float('inf')
    return f1, avg_dist, matches

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("  DENSITY & CLUSTER BENCHMARK: ATS Tier 3 vs Full SAHI")
    print(f"  Device: {DEVICE} | Grid: {GRID_CELLS}×{GRID_CELLS} | DBSCAN eps={DBSCAN_EPS}")
    print("=" * 70)

    print("\n[1/3] Loading models...")
    yolo = YOLO('best.pt'); yolo.to(DEVICE)
    sahi_model = AutoDetectionModel.from_pretrained(
        model_type='yolov8', model_path='best.pt',
        confidence_threshold=CONF, device="cpu")
    videos = sorted([f for f in os.listdir(VIDEO_DIR) if f.endswith('.mp4')])
    print(f"  ✓ {len(videos)} videos found")

    print(f"\n[2/3] Running analysis ({SAMPLE_FRAMES} frames × {len(videos)} videos)...\n")

    all_vid_results = []

    for vid_name in videos:
        cap = cv2.VideoCapture(os.path.join(VIDEO_DIR, vid_name))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        print(f"  ── {vid_name} ({w}×{h}) ──")

        grid_corrs, grid_maes, hmap_maes = [], [], []
        cluster_f1s, cluster_dists, cluster_size_errs = [], [], []

        sampled, fidx = 0, 0
        while sampled < SAMPLE_FRAMES:
            cap.set(cv2.CAP_PROP_POS_FRAMES, fidx)
            ret, frame = cap.read()
            if not ret: break

            sahi_dets = run_sahi(frame, sahi_model)
            tier3_dets = run_tier3(frame, yolo)

            sc = get_centers(sahi_dets)
            tc = get_centers(tier3_dets)

            # 1. Density grid
            sg = density_grid(sc, h, w)
            tg = density_grid(tc, h, w)
            grid_mae = np.mean(np.abs(sg - tg))
            grid_maes.append(grid_mae)
            if sg.std() > 0 and tg.std() > 0:
                corr = np.corrcoef(sg.flatten(), tg.flatten())[0, 1]
                grid_corrs.append(corr)

            # 2. Density heatmap
            sh = density_heatmap(sc, h, w)
            th = density_heatmap(tc, h, w)
            max_val = max(sh.max(), th.max(), 1e-6)
            hmap_mae = np.mean(np.abs(sh - th)) / max_val
            hmap_maes.append(hmap_mae)

            # 3. Cluster matching
            s_clusters, _ = cluster_dets(sc)
            t_clusters, _ = cluster_dets(tc)
            f1, avg_d, matches = match_clusters(s_clusters, t_clusters)
            cluster_f1s.append(f1)
            if avg_d != float('inf'): cluster_dists.append(avg_d)
            for _, _, _, rs, ts in matches:
                cluster_size_errs.append(abs(rs - ts))

            sampled += 1; fidx += FRAME_SKIP
            print(f"    Frame {fidx:4d}: grid_corr={grid_corrs[-1] if grid_corrs and len(grid_corrs)==sampled else 'N/A':>6} "
                  f"grid_mae={grid_mae:.2f} hmap_mae={hmap_mae:.4f} "
                  f"clusters S={len(s_clusters)} T3={len(t_clusters)} F1={f1:.2f}")

        cap.release()
        if not grid_maes: continue

        vid_result = {
            'video': vid_name,
            'density_grid_corr': round(np.mean(grid_corrs), 4) if grid_corrs else None,
            'density_grid_mae': round(np.mean(grid_maes), 3),
            'density_heatmap_mae_norm': round(np.mean(hmap_maes), 5),
            'cluster_f1': round(np.mean(cluster_f1s), 4),
            'cluster_centroid_dist_px': round(np.mean(cluster_dists), 1) if cluster_dists else None,
            'cluster_size_mae': round(np.mean(cluster_size_errs), 2) if cluster_size_errs else None,
        }
        all_vid_results.append(vid_result)
        print(f"    ─ Grid Corr: {vid_result['density_grid_corr']} | Grid MAE: {vid_result['density_grid_mae']} | "
              f"Cluster F1: {vid_result['cluster_f1']} | Centroid Dist: {vid_result['cluster_centroid_dist_px']}px")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  RESULTS SUMMARY")
    print("=" * 70)
    print(f"\n  {'Video':<22} {'Grid Corr':>10} {'Grid MAE':>9} {'Hmap MAE':>9} "
          f"{'Clust F1':>9} {'Cent Dist':>10} {'Size MAE':>9}")
    print("  " + "-" * 75)

    for r in all_vid_results:
        gc = f"{r['density_grid_corr']:.4f}" if r['density_grid_corr'] is not None else "N/A"
        cd = f"{r['cluster_centroid_dist_px']:.1f}px" if r['cluster_centroid_dist_px'] is not None else "N/A"
        sm = f"{r['cluster_size_mae']:.2f}" if r['cluster_size_mae'] is not None else "N/A"
        print(f"  {r['video']:<22} {gc:>10} {r['density_grid_mae']:>9.3f} "
              f"{r['density_heatmap_mae_norm']:>9.5f} {r['cluster_f1']:>9.4f} {cd:>10} {sm:>9}")

    corrs = [r['density_grid_corr'] for r in all_vid_results if r['density_grid_corr'] is not None]
    gmaes = [r['density_grid_mae'] for r in all_vid_results]
    hmaes = [r['density_heatmap_mae_norm'] for r in all_vid_results]
    cf1s = [r['cluster_f1'] for r in all_vid_results]
    cdists = [r['cluster_centroid_dist_px'] for r in all_vid_results if r['cluster_centroid_dist_px'] is not None]
    smaes = [r['cluster_size_mae'] for r in all_vid_results if r['cluster_size_mae'] is not None]

    print("  " + "-" * 75)
    gc = f"{np.mean(corrs):.4f}" if corrs else "N/A"
    cd = f"{np.mean(cdists):.1f}px" if cdists else "N/A"
    sm = f"{np.mean(smaes):.2f}" if smaes else "N/A"
    print(f"  {'OVERALL':<22} {gc:>10} {np.mean(gmaes):>9.3f} "
          f"{np.mean(hmaes):>9.5f} {np.mean(cf1s):>9.4f} {cd:>10} {sm:>9}")

    print(f"\n  Metric Guide:")
    print(f"    Grid Corr    = Pearson correlation of density grids (1.0 = identical distribution)")
    print(f"    Grid MAE     = Avg count difference per grid cell (lower = better)")
    print(f"    Hmap MAE     = Normalized heatmap difference (lower = better)")
    print(f"    Cluster F1   = F1 score for cluster detection (1.0 = same clusters found)")
    print(f"    Cent Dist    = Avg distance between matched cluster centers (lower = better)")
    print(f"    Size MAE     = Avg difference in cluster sizes (lower = better)")
    print()

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'benchmark_density_results.json')
    with open(out, 'w') as f:
        json.dump({'timestamp': datetime.now().isoformat(), 'results': all_vid_results}, f, indent=2)
    print(f"  Saved to {out}")

if __name__ == '__main__':
    main()
