# Live View YOLOv8 Integration Guide

## Overview
The Live View component now displays real-time YOLOv8 people detection with:
- ✅ **Annotated frames** with bounding boxes drawn by backend
- ✅ **CCTV overlay** with timestamp, people count, and FPS
- ✅ **Toggle between** annotated feed and original video
- ✅ **Real-time controls** to start/stop detection
- ✅ **Configurable parameters** (confidence & IoU thresholds)
- ✅ **Live statistics** showing detected people and FPS

## Quick Start

### 1. Install Backend Dependencies
```bash
cd server
pip3 install -r requirements.txt
```

This installs:
- `ultralytics` - YOLOv8
- `opencv-python` - Video processing
- `torch` - Deep learning
- `flask` - API server
- `flask-cors` - CORS support

### 2. Verify Setup
```bash
python3 server/test_yolo_setup.py
```

### 3. Start Backend Server
```bash
python3 server/app.py
```

Server runs on `http://localhost:5001`

### 4. Start Frontend
```bash
npm run dev
```

Frontend runs on `http://localhost:5173` (or next available port)

### 5. Navigate to Live View
Click "Live View" in navigation menu

## Features

### Annotated Feed Display
- Backend processes each frame with YOLOv8
- Draws bounding boxes around detected people
- Adds confidence scores to each detection
- Overlays CCTV info (timestamp, count, FPS)
- Sends annotated frame to frontend as base64 image

### Toggle Feed Modes
**🎯 YOLO Feed (default)**
- Shows fully annotated frames from backend
- CCTV overlay with all info
- Bounding boxes pre-drawn
- Best for production use

**📹 Original Feed**
- Shows original video
- Manual overlay with detection boxes
- Useful for comparison
- Shows detection data from API

### Real-Time Detection Controls
**Start Detection Button**
- Begins continuous frame processing
- Updates every 500ms
- Displays live people count
- Shows processing FPS

**Stop Detection Button**
- Stops frame processing
- Clears detection data
- Pauses resource usage

### Configuration Sliders

**Confidence Threshold (0.1 - 0.9)**
- Default: 0.5
- Lower = More detections (may include false positives)
- Higher = Fewer, more accurate detections
- Updates backend configuration in real-time

**IoU Threshold (0.2 - 0.7)**
- Default: 0.45
- Lower = Merge overlapping boxes more aggressively
- Higher = Keep more separate boxes
- Controls Non-Maximum Suppression

### Live Statistics
- **People Detected**: Current count from YOLOv8
- **Max Capacity**: Location capacity
- **Crowd Density**: Percentage of capacity
- **Processing Speed**: Backend FPS

## How It Works

### Detection Flow
```
1. Frontend → Backend: Request frame N with config
2. Backend: Read frame N from video
3. Backend: Run YOLOv8 inference (filtered to "person" class)
4. Backend: Draw bounding boxes with confidence scores
5. Backend: Add CCTV overlay (timestamp, count, FPS)
6. Backend: Encode annotated frame as JPEG → base64
7. Backend → Frontend: Send annotated frame + detection data
8. Frontend: Display annotated frame as image
9. Repeat every 500ms for continuous detection
```

### API Integration
```javascript
// Initialize detection
POST /api/yolo/initialize
{
  "video": "demo_video.mp4",
  "conf_threshold": 0.5,
  "iou_threshold": 0.45,
  "use_gpu": true
}

// Process frame
POST /api/yolo/process-frame
{
  "frame_number": 0,
  "annotate": true,
  "show_overlay": true
}

// Response
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

## User Interface

### Status Indicators
- **✓ Backend Connected** - YOLOv8 initialized
- **✓ Video Loaded** - Video file loaded
- **✓ Detection Active** - Processing frames
- **👥 X People Detected** - Live count

### Feed Toggle Button
- **🎯 YOLO Feed** - Showing annotated frames
- **📹 Original** - Showing original video

### FPS Display
Bottom left corner shows:
- Current feed mode
- Processing FPS (from backend)

### Detection Controls Panel
- Start/Stop button
- Confidence threshold slider
- IoU threshold slider
- Real-time config updates

## Performance

### Expected FPS
| Hardware | YOLOv8n FPS | Notes |
|----------|-------------|-------|
| NVIDIA RTX 3080 | 50-60 | Optimal |
| NVIDIA GTX 1660 | 35-45 | Good |
| Apple M1/M2 | 25-35 | Good |
| Intel i7 CPU | 8-12 | Acceptable |
| Intel i5 CPU | 4-8 | Slow |

### Optimization
- Frontend processes every 500ms (2 FPS request rate)
- Backend skips 10 frames between processing (smoother loop)
- Automatic GPU detection
- Frame compression with JPEG encoding

## Troubleshooting

### Backend Not Connected
**Symptoms:** "⏳ Connecting to Backend..." stuck

**Solution:**
```bash
# Check if Flask server is running
curl http://localhost:5001/api/health

# Start server if not running
python3 server/app.py
```

### Video Not Loading
**Symptoms:** "Failed to load video"

**Solution:**
- Verify `demo_video.mp4` exists in `public/assets/`
- Check file is valid MP4 format
- Try different browser

### No Detections
**Symptoms:** Detection active but count stays at 0

**Solutions:**
1. Lower confidence threshold (try 0.3)
2. Check video actually contains people
3. Verify YOLOv8 model loaded correctly
4. Check backend logs for errors

### CORS Errors
**Symptoms:** "CORS policy blocked" in console

**Solution:**
- Ensure Flask-CORS is installed
- Check `CORS(app)` in `app.py`
- Clear browser cache

### Slow Performance
**Symptoms:** Low FPS, laggy video

**Solutions:**
1. Check GPU is being used (backend logs)
2. Increase confidence threshold (fewer detections)
3. Increase frame skip interval
4. Use smaller video resolution

### Import Errors
**Symptoms:** "ModuleNotFoundError" in backend

**Solution:**
```bash
cd server
pip3 install -r requirements.txt --upgrade

# Verify installation
python3 -c "import torch; import cv2; from ultralytics import YOLO; print('All imports OK')"
```

## Configuration Tips

### For More Detections
- Confidence: 0.3 - 0.4
- IoU: 0.3 - 0.4
- Trade-off: More false positives

### For High Accuracy
- Confidence: 0.6 - 0.7
- IoU: 0.5 - 0.6
- Trade-off: May miss some people

### Balanced (Recommended)
- Confidence: 0.5
- IoU: 0.45
- Good balance of accuracy and completeness

## Advanced Features

### Full Analysis Mode
Click "Run Full Analysis" to:
1. Stop continuous detection
2. Process multiple frames with progress bar
3. Generate crowd density heatmap (if >20 people)
4. Show alternative location recommendations
5. Resume continuous detection

### Location Switching
- Select different location from left panel
- Detection automatically resets
- Video continues playing
- System re-initializes

### Detection Data
Access raw detection data:
- `detections` array with box coordinates
- `confidence` scores for each detection
- `count` total people in frame
- `fps` processing speed

## Development

### Adding Custom Features

**Custom video source:**
```javascript
// In LiveView.jsx, update video source
<video src="/assets/your_video.mp4" />

// Update backend initialization
body: JSON.stringify({ video: 'your_video.mp4' })
```

**Webcam support:**
```javascript
// Add webcam option
const useWebcam = true;

// Use webcam endpoint
fetch(`${API_URL}/yolo/webcam/detect`, {
  method: 'POST',
  body: JSON.stringify({ frame: webcamFrameBase64 })
});
```

**Custom detection logic:**
```javascript
// Process detections before display
const filteredDetections = data.detections.filter(
  d => d.confidence > customThreshold
);
```

## Files Modified

### Frontend
- `src/components/liveView/LiveView.jsx` - Main component with YOLOv8 integration
  - Added annotated frame display
  - Feed toggle functionality
  - Real-time detection controls
  - Configuration sliders
  - FPS display

### Backend (Already Done)
- `server/app.py` - Enhanced with:
  - Annotated frame generation
  - CCTV overlay drawing
  - Detection configuration endpoints
  - FPS tracking
  - Webcam support

### Documentation
- `YOLO_DETECTION_GUIDE.md` - Comprehensive YOLOv8 guide
- `README_DETECTION.md` - Quick reference
- `LIVE_VIEW_SETUP.md` - This file

## Demo Commands

### Test standalone detection
```bash
# Webcam
python3 server/yolo_realtime_detection.py --source webcam

# Video file
python3 server/yolo_realtime_detection.py --source public/assets/demo_video.mp4

# Save output
python3 server/yolo_realtime_detection.py --source demo_video.mp4 --output detected.mp4
```

### Run interactive demos
```bash
python3 demo_detection.py
```

### API testing
```bash
# Initialize
curl -X POST http://localhost:5001/api/yolo/initialize \
  -H "Content-Type: application/json" \
  -d '{"video": "demo_video.mp4"}'

# Process frame
curl -X POST http://localhost:5001/api/yolo/process-frame \
  -H "Content-Type: application/json" \
  -d '{"frame_number": 0, "annotate": true}'
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Verify setup with test script
3. ✅ Start backend server
4. ✅ Start frontend
5. ✅ Navigate to Live View
6. ✅ Click "Start Detection"
7. ✅ Toggle between feeds
8. ✅ Adjust configuration sliders
9. ✅ Monitor live statistics

Enjoy real-time people detection in your Live View! 🎯
