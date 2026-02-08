# YOLOv8 Real-Time People Detection

## Quick Start

### 1. Install Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 2. Verify Setup
```bash
python server/test_yolo_setup.py
```

### 3. Run Detection

#### Webcam Detection
```bash
python server/yolo_realtime_detection.py --source webcam
```

#### Video File Detection
```bash
python server/yolo_realtime_detection.py --source public/assets/demo_video.mp4
```

#### Save Annotated Output
```bash
python server/yolo_realtime_detection.py --source demo_video.mp4 --output detected.mp4
```

## Features

✅ **Automatic People Detection** - No hardcoded boxes, fully automatic YOLOv8 inference
✅ **Real-Time Processing** - 30+ FPS on GPU, 5-15 FPS on CPU
✅ **CCTV Overlay** - Timestamp, people count, and FPS display
✅ **Bounding Boxes** - Drawn automatically with confidence scores
✅ **Webcam Support** - Live detection from camera
✅ **Video File Support** - Process any video file
✅ **Save Output** - Record annotated videos
✅ **GPU Acceleration** - Automatic CUDA detection
✅ **Configurable** - Adjust confidence threshold (0.5), IoU (0.45)
✅ **Flask API** - REST endpoints for integration

## Configuration

### Detection Parameters
- **Confidence Threshold**: `0.5` (0.0-1.0) - Minimum detection confidence
- **IoU Threshold**: `0.45` (0.0-1.0) - Overlap threshold for NMS
- **GPU**: Auto-detected, uses CUDA if available
- **Class Filter**: Only detects "person" (class 0)

### Command Line Options
```bash
python server/yolo_realtime_detection.py \
  --source webcam \          # Input source
  --output result.mp4 \      # Output file
  --conf 0.5 \               # Confidence threshold
  --iou 0.45 \               # IoU threshold
  --no-gpu \                 # Disable GPU
  --no-display               # Don't show window
```

## Keyboard Controls
- `q` - Quit detection
- `s` - Save current frame

## Flask API Endpoints

### Initialize Detection
```bash
POST /api/yolo/initialize
{
  "video": "demo_video.mp4",
  "conf_threshold": 0.5,
  "iou_threshold": 0.45,
  "use_gpu": true
}
```

### Process Frame
```bash
POST /api/yolo/process-frame
{
  "frame_number": 0,
  "annotate": true,
  "show_overlay": true
}
```

### Stream Detection
```bash
GET /api/yolo/stream?source=video
GET /api/yolo/stream?source=webcam
```

### Webcam Detection
```bash
POST /api/yolo/webcam/detect
{
  "frame": "base64_encoded_image"
}
```

## Architecture

### Detection Pipeline
1. **Input** → Video frame (BGR format)
2. **YOLO Inference** → YOLOv8n model with class filter
3. **Filter** → Extract "person" detections above threshold
4. **Annotate** → Draw bounding boxes with confidence
5. **Overlay** → Add CCTV info (timestamp, count, FPS)
6. **Output** → Annotated frame

### CCTV Overlay
```
┌─────────────────────────────────────────────┐
│ CCTV - 2026-02-08 14:30:45  PEOPLE: 12  FPS: 28.5 │
│ Conf: 0.5 | IoU: 0.45                      │
└─────────────────────────────────────────────┘
```

### Bounding Boxes
- **Color**: Green (RGB: 0, 255, 0)
- **Thickness**: 2px
- **Label**: "Person 0.87" (confidence score)
- **Label Background**: Green box
- **Label Text**: Black

## Performance

| Device | Model | FPS | Notes |
|--------|-------|-----|-------|
| NVIDIA RTX 3080 | YOLOv8n | 60+ | Optimal |
| NVIDIA GTX 1660 | YOLOv8n | 40+ | Good |
| Apple M1/M2 | YOLOv8n | 30+ | Good |
| Intel i7 CPU | YOLOv8n | 10-15 | Acceptable |
| Intel i5 CPU | YOLOv8n | 5-10 | Slow |

### Optimization Tips
- Use GPU for 10x+ speedup
- Increase confidence threshold for faster processing
- Skip frames (process every Nth frame)
- Use YOLOv8n (fastest) vs YOLOv8s/m/l/x

## Demo Scripts

### Run Interactive Demos
```bash
python demo_detection.py
```

Includes:
1. Simple webcam detection
2. Video file detection
3. Save annotated output
4. Custom frame-by-frame processing
5. Parameter comparison

## Troubleshooting

### Model Download
First run auto-downloads YOLOv8n (~6MB) from Ultralytics.

### GPU Not Working
```bash
python -c "import torch; print(torch.cuda.is_available())"
```

### Video Not Found
Place video in `public/assets/demo_video.mp4`

### Import Errors
```bash
pip install -r server/requirements.txt --upgrade
```

## Documentation

- [YOLO_DETECTION_GUIDE.md](YOLO_DETECTION_GUIDE.md) - Comprehensive guide
- [YOLO_SETUP.md](YOLO_SETUP.md) - Setup instructions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

## Examples

See [YOLO_DETECTION_GUIDE.md](YOLO_DETECTION_GUIDE.md) for more examples and code integration patterns.
