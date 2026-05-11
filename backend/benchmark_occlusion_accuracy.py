import cv2, torch, torchvision, os, time, json
import numpy as np
from ultralytics import YOLO

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

def run_baseline(frame, model):
    start = time.time()
    results = model.predict(frame, conf=CONF, iou=IOU, classes=[0], verbose=False)
    count = len(results[0].boxes) if results[0].boxes is not None else 0
    return count, time.time() - start

def run_occlusion_aware(frame, model):
    start = time.time()
    h, w = frame.shape[:2]
    # Pass 1
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
    model = YOLO('best.pt')
    results = []
    video_dir = '../frontend/public/assets'
    
    print(f"{'Location':<20} | {'GT':<3} | {'Base':<4} | {'OA-ATS':<6} | {'Base-Err':<8} | {'OA-Err':<6}")
    print("-" * 65)
    
    total_base_err = 0
    total_oa_err = 0
    
    for vid, gt in GT_DATA.items():
        vpath = os.path.join(video_dir, vid)
        if not os.path.exists(vpath): continue
        
        cap = cv2.VideoCapture(vpath)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 300)
        ret, frame = cap.read()
        cap.release()
        
        c_base, t_base = run_baseline(frame, model)
        c_oa, t_oa = run_occlusion_aware(frame, model)
        
        err_base = abs(c_base - gt)
        err_oa = abs(c_oa - gt)
        
        total_base_err += err_base
        total_oa_err += err_oa
        
        print(f"{vid:<20} | {gt:<3} | {c_base:<4} | {c_oa:<6} | {err_base:<8} | {err_oa:<6}")
        
        results.append({
            'video': vid,
            'ground_truth': gt,
            'baseline': c_base,
            'occlusion_aware': c_oa,
            'err_baseline': err_base,
            'err_oa': err_oa
        })

    mae_base = total_base_err / len(results)
    mae_oa = total_oa_err / len(results)
    
    print("-" * 65)
    print(f"{'MEAN ABS ERROR':<20} | {'':<3} | {'':<4} | {'':<6} | {mae_base:<8.2f} | {mae_oa:<6.2f}")
    
    with open('accuracy_results.json', 'w') as f:
        json.dump({'results': results, 'mae_baseline': mae_base, 'mae_oa': mae_oa}, f, indent=4)

if __name__ == "__main__":
    main()
