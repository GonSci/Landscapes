import cv2, torch, torchvision, os, time, json
import numpy as np
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# Config
CONF = 0.5
HEAD_CONF = 0.25
IOU = 0.45
TILE = 640
OVERLAP = 0.15

# Manually Verified Ground Truth (Counts for specific frames @ frame 300)
GT_DATA = {
    'night_market.mp4': 38,
    'cathedral.mp4': 24,
    'mansion_entrance.mp4': 18,
    'burnham.mp4': 12
}

def select_device():
    if torch.backends.mps.is_available(): return "mps"
    if torch.cuda.is_available(): return "cuda"
    return "cpu"

DEVICE = select_device()

def run_baseline(frame, model):
    start = time.time()
    results = model.predict(frame, conf=CONF, iou=IOU, classes=[0], verbose=False)
    count = len(results[0].boxes) if results[0].boxes is not None else 0
    return count, time.time() - start

def run_sahi(frame, sahi_model):
    start = time.time()
    results = get_sliced_prediction(
        frame, sahi_model, slice_height=TILE, slice_width=TILE,
        overlap_height_ratio=OVERLAP, overlap_width_ratio=OVERLAP,
        postprocess_match_metric="IOU", postprocess_match_threshold=IOU,
        postprocess_class_agnostic=True, verbose=False)
    
    count = 0
    h, w = frame.shape[:2]
    for obj in results.object_prediction_list:
        if obj.category.id != 0: continue
        x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
        bw, bh = x2 - x1, y2 - y1
        if bw > w * 0.6 or bh > h * 0.6: continue
        count += 1
        
    return count, time.time() - start

def run_occlusion_aware(frame, model):
    start = time.time()
    h, w = frame.shape[:2]
    
    # Pass 1: Normal full frame
    r1 = model.predict(frame, conf=CONF, iou=IOU, classes=[0], verbose=False)
    b1 = r1[0].boxes.xyxy.cpu() if r1[0].boxes is not None else torch.zeros(0,4)
    s1 = r1[0].boxes.conf.cpu() if r1[0].boxes is not None else torch.zeros(0)
    
    # Pass 2: Tiled
    stride = int(TILE * (1 - OVERLAP))
    all_b2, all_s2 = [], []
    for y in range(0, h, stride):
        for x in range(0, w, stride):
            x2, y2 = min(x+TILE, w), min(y+TILE, h)
            x1, y1 = max(0, x2-TILE), max(0, y2-TILE)
            tile = frame[y1:y2, x1:x2]
            r = model.predict(tile, conf=HEAD_CONF, iou=IOU, classes=[0], verbose=False)
            if r[0].boxes is not None:
                for box in r[0].boxes:
                    bx1, by1, bx2, by2 = box.xyxy[0].cpu()
                    all_b2.append(torch.tensor([bx1+x1, by1+y1, bx2+x1, by2+y1]))
                    all_s2.append(box.conf[0].cpu())
    
    b2 = torch.stack(all_b2) if all_b2 else torch.zeros(0,4)
    s2 = torch.stack(all_s2) if all_s2 else torch.zeros(0)
    
    if len(b1) == 0 and len(b2) == 0: return 0, time.time() - start
    
    all_boxes = torch.cat([b1, b2])
    all_scores = torch.cat([s1, s2])
    keep = torchvision.ops.nms(all_boxes, all_scores, IOU)
    
    count = 0
    for i in keep:
        bx1, by1, bx2, by2 = all_boxes[i]
        if (bx2-bx1) > w*0.6 or (by2-by1) > h*0.6: continue
        count += 1
    return count, time.time() - start

def main():
    print(f"Loading YOLO model on {DEVICE}...")
    model = YOLO('best.pt')
    
    print(f"Loading SAHI model on {DEVICE}...")
    sahi_model = AutoDetectionModel.from_pretrained(
        model_type='yolov8',
        model_path='best.pt',
        confidence_threshold=CONF,
        device=DEVICE
    )
    
    results = []
    video_dir = '../frontend/public/assets'
    
    print(f"{'Location':<20} | {'GT':<3} | {'Base':<4} | {'SAHI':<4} | {'OA-ATS':<6} | {'SAHI (TP/FP/FN)':<17} | {'OA-ATS (TP/FP/FN)':<17}")
    print("-" * 105)
    
    total_base_err, total_sahi_err, total_oa_err = 0, 0, 0
    total_base_time, total_sahi_time, total_oa_time = 0, 0, 0
    valid_vids = 0
    
    def calc_metrics(count, gt):
        if count <= gt:
            return count, 0, gt - count # TP, FP, FN
        else:
            return gt, count - gt, 0

    for vid, gt in GT_DATA.items():
        vpath = os.path.join(video_dir, vid)
        if not os.path.exists(vpath): continue
        valid_vids += 1
        
        cap = cv2.VideoCapture(vpath)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 300)
        ret, frame = cap.read()
        cap.release()
        
        c_base, t_base = run_baseline(frame, model)
        c_sahi, t_sahi = run_sahi(frame, sahi_model)
        c_oa, t_oa = run_occlusion_aware(frame, model)
        
        err_base = abs(c_base - gt)
        err_sahi = abs(c_sahi - gt)
        err_oa = abs(c_oa - gt)
        
        total_base_err += err_base
        total_sahi_err += err_sahi
        total_oa_err += err_oa
        
        total_base_time += t_base
        total_sahi_time += t_sahi
        total_oa_time += t_oa

        sahi_tp, sahi_fp, sahi_fn = calc_metrics(c_sahi, gt)
        oa_tp, oa_fp, oa_fn = calc_metrics(c_oa, gt)
        
        sahi_str = f"{sahi_tp}/{sahi_fp}/{sahi_fn}"
        oa_str = f"{oa_tp}/{oa_fp}/{oa_fn}"
        
        print(f"{vid:<20} | {gt:<3} | {c_base:<4} | {c_sahi:<4} | {c_oa:<6} | {sahi_str:<17} | {oa_str:<17}")
        
        results.append({
            'video': vid,
            'ground_truth': gt,
            'baseline': c_base,
            'sahi': c_sahi,
            'occlusion_aware': c_oa,
            'err_baseline': err_base,
            'err_sahi': err_sahi,
            'err_oa': err_oa,
            'time_baseline': t_base,
            'time_sahi': t_sahi,
            'time_oa': t_oa,
            'sahi_metrics': {'tp': sahi_tp, 'fp': sahi_fp, 'fn': sahi_fn},
            'oa_metrics': {'tp': oa_tp, 'fp': oa_fp, 'fn': oa_fn}
        })

    if valid_vids == 0:
        print("No videos found to process.")
        return

    mae_base = total_base_err / valid_vids
    mae_sahi = total_sahi_err / valid_vids
    mae_oa = total_oa_err / valid_vids
    
    avg_fps_base = 1.0 / (total_base_time / valid_vids)
    avg_fps_sahi = 1.0 / (total_sahi_time / valid_vids)
    avg_fps_oa = 1.0 / (total_oa_time / valid_vids)
    
    print("-" * 105)
    print(f"{'MEAN ABS ERROR':<20} | {'':<3} | {'':<4} | {'':<4} | {'':<6} | {mae_sahi:<17.2f} | {mae_oa:<17.2f}")
    print(f"{'AVG FPS':<20} | {'':<3} | {avg_fps_base:<4.1f} | {avg_fps_sahi:<4.1f} | {avg_fps_oa:<6.1f} | {'':<7} | {'':<7} | {'':<5}")
    
    with open('benchmark_sahi_vs_oa_results.json', 'w') as f:
        json.dump({
            'results': results, 
            'mae_baseline': mae_base, 
            'mae_sahi': mae_sahi,
            'mae_oa': mae_oa,
            'fps_baseline': avg_fps_base,
            'fps_sahi': avg_fps_sahi,
            'fps_oa': avg_fps_oa
            }, f, indent=4)

if __name__ == "__main__":
    main()
