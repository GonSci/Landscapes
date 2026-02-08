# YOLOv8 Real-time People Detection - Quick Start Guide

## Overview
This implementation provides real-time people detection using YOLOv8 with:
- **Automatic people detection** with bounding boxes and confidence scores
- **CCTV overlay** showing timestamp, people count, and FPS
- **GPU acceleration** when available
- **Webcam and video file support**
- **Configurable detection parameters** (confidence threshold, IoU)
- **Annotated output** that can be saved

## Installation

### 1. Install Dependencies
```bash
cd server
pip install -r requirements.txt
```

This installs:
- `ultralytics` - YOLOv8 implementation
- `opencv-python` - Video I/O and processing
- `torch` - Deep learning framework
- `numpy` - Numerical operations

### 2. Verify Setup
```bash
python test_yolo_setup.py
```

This will:
- Check all dependencies
- Test video file availability
- Load YOLOv8 model
- Run sample detection

## Usage

### Method 1: Standalone Real-time Detection Script

#### Process Webcam
```bash
python server/yolo_realtime_detection.py --source webcam
```

#### Process Video File
```bash
python server/yolo_realtime_detection.py --source public/assets/demo_video.mp4
```

#### Save Annotated Output
```bash
python server/yolo_realtime_detection.py --source demo_video.mp4 --output detected.mp4
```

#### Custom Detection Parameters
```bash
python server/yolo_realtime_detection.py \
  --source webcam \
  --conf 0.6 \
  --iou 0.5 \
  --no-gpu
```

#### All Options
```bash
python server/yolo_realtime_detection.py --help
```

**Keyboard Controls:**
- `q` - Quit detection
- `s` - Save current frame as image

### Method 2: Flask API Integration

#### Start Flask Server
```bash
python server/app.py
```

#### Initialize Detection (with config)
```bash
curl -X POST http://localhost:5001/api/yolo/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "video": "demo_video.mp4",
    "conf_threshold": 0.5,
    "iou_threshold": 0.45,
    "use_gpu": true
  }'
```

#### Process Single Frame
```bash
curl -X POST http://localhost:5001/api/yolo/process-frame \
  -H "Content-Type: application/json" \
  -d '{
    "frame_number": 0,
    "annotate": true,
    "show_overlay": true
  }'
```

#### Stream Video Detection
```bash
# Stream video file
curl http://localhost:5001/api/yolo/stream?source=video

# Stream webcam
curl http://localhost:5001/api/yolo/stream?source=webcam
```

#### Update Detection Config
```bash
curl -X POST http://localhost:5001/api/yolo/config \
  -H "Content-Type: application/json" \
  -d '{
    "conf_threshold": 0.6,
    "iou_threshold": 0.5,
    "use_gpu": true
  }'
```

## Configuration Parameters

### Confidence Threshold (`conf`)
- **Range:** 0.0 - 1.0
- **Default:** 0.5
- **Purpose:** Minimum confidence score for detections
- **Lower values:** More detections (more false positives)
- **Higher values:** Fewer detections (more accurate)

### IoU Threshold (`iou`)
- **Range:** 0.0 - 1.0
- **Default:** 0.45
- **Purpose:** Intersection over Union threshold for Non-Maximum Suppression
- **Lower values:** More aggressive box merging
- **Higher values:** Keep more overlapping boxes

### GPU Usage
- **Default:** Enabled (if available)
- **Auto-detect:** Uses CUDA if available, falls back to CPU
- **Force CPU:** Use `--no-gpu` flag or set `use_gpu: false`

## Flask API Endpoints

### Detection Endpoints
- `POST /api/yolo/initialize` - Initialize model and set video source
- `POST /api/yolo/process-frame` - Process single frame with detection
- `GET /api/yolo/stream` - Stream real-time detection (SSE)
- `POST /api/yolo/webcam/detect` - Detect from webcam frame
- `POST /api/yolo/analyze-video` - Analyze entire video statistics
- `GET /api/yolo/video-info` - Get video file information
- `GET/POST /api/yolo/config` - Get or update detection config

### Response Format
```json
{
  "frame": "base64_encoded_annotated_frame",
  "detections": [
    {
      "x": 10.5,
      "y": 20.3,
      "width": 15.2,
      "height": 30.1,
      "confidence": 0.87
    }
  ],
  "count": 5,
  "fps": 28.5,
  "processing_time": 0.035
}
```

## Implementation Details

### YOLOv8 Model
- **Model:** YOLOv8n (Nano) - Optimized for speed
- **Classes:** Filtered to detect only "person" (class 0)
- **Input:** Video frames in BGR format
- **Output:** Bounding boxes with confidence scores

### Detection Pipeline
1. **Frame Capture:** Read frame from video/webcam
2. **YOLO Inference:** Run model on frame with configured thresholds
3. **Filter Results:** Extract only "person" class detections
4. **Draw Boxes:** Annotate frame with bounding boxes and labels
5. **Add Overlay:** Draw CCTV info (timestamp, count, FPS)
6. **Return/Display:** Show or save annotated frame

### CCTV Overlay Features
- **Timestamp:** Current date and time
- **People Count:** Number of detected people
- **FPS:** Real-time processing speed
- **Config Info:** Current detection parameters

### Performance Notes
- **GPU:** ~30-60 FPS on modern GPUs
- **CPU:** ~5-15 FPS on modern CPUs
- **YOLOv8n:** Optimized for speed over accuracy
- **Frame Skipping:** Frontend skips frames for smoother performance

## Troubleshooting

### Model Download
On first run, YOLOv8n model (~6MB) downloads automatically from Ultralytics.

### GPU Not Detected
```bash
python -c "import torch; print(torch.cuda.is_available())"
```
If `False`, install CUDA-enabled PyTorch:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Video File Not Found
Place video file in `public/assets/demo_video.mp4` or specify full path.

### Import Errors
```bash
pip install -r server/requirements.txt --upgrade
```

### Webcam Access Denied
Check OS permissions for camera access in System Settings.

## Examples

### Example 1: Quick Webcam Detection
```bash
python server/yolo_realtime_detection.py --source webcam --conf 0.6
```

### Example 2: Process Video and Save
```bash
python server/yolo_realtime_detection.py \
  --source public/assets/demo_video.mp4 \
  --output results/annotated_video.mp4 \
  --conf 0.5 \
  --iou 0.45
```

### Example 3: High Accuracy Mode
```bash
python server/yolo_realtime_detection.py \
  --source webcam \
  --conf 0.7 \
  --iou 0.3
```

### Example 4: CPU-Only Processing
```bash
python server/yolo_realtime_detection.py \
  --source demo_video.mp4 \
  --no-gpu \
  --no-display \
  --output output.mp4
```

## Code Integration

### Using RealtimeDetector Class
```python
from yolo_realtime_detection import RealtimeDetector

# Initialize detector
detector = RealtimeDetector(
    model_path='yolov8n.pt',
    conf_threshold=0.5,
    iou_threshold=0.45,
    use_gpu=True
)

# Process video
detector.process_video(
    source='demo_video.mp4',  # or 0 for webcam
    output_path='output.mp4',
    display=True
)
```

### Custom Frame Processing
```python
detector = RealtimeDetector()

# Read frame
import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()

# Detect people
detections = detector.detect_people(frame)
print(f"Found {len(detections)} people")

# Annotate frame
annotated = detector.draw_detections(frame, detections)
annotated = detector.draw_cctv_overlay(annotated, len(detections))

# Show or save
cv2.imshow('Detection', annotated)
cv2.imwrite('detection.jpg', annotated)
```

## Performance Tips

1. **Use GPU:** Dramatically faster (10x+ speedup)
2. **Adjust Confidence:** Higher threshold = faster processing
3. **Skip Frames:** Process every Nth frame for real-time performance
4. **Resize Input:** Smaller frames process faster
5. **Use YOLOv8n:** Already optimized, but YOLOv8s available for better accuracy

## Next Steps

- Add multiple camera support
- Implement detection zones
- Add people tracking (track IDs across frames)
- Export detection statistics to CSV
- Add alerts for crowd thresholds
- Implement pose estimation
- Add face blurring for privacy

## Resources

- **YOLOv8 Docs:** https://docs.ultralytics.com/
- **OpenCV Docs:** https://docs.opencv.org/
- **PyTorch Docs:** https://pytorch.org/docs/

## Support

For issues:
1. Run `python test_yolo_setup.py` to diagnose
2. Check TROUBLESHOOTING.md
3. Verify dependencies are installed
4. Ensure video file exists in correct location
