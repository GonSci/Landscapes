# 🚀 Quick Start Guide - Landscapes with YOLOv8

## Complete Setup in 3 Steps

### Step 1: Install Dependencies (One-time setup)
```bash
# Install backend dependencies
cd server
pip3 install -r requirements.txt

# Go back to project root
cd ..

# Install frontend dependencies (if not already done)
npm install
```

### Step 2: Start Backend Server
```bash
# Terminal 1 - Start Flask backend
python3 server/app.py
```

You should see:
```
Starting Travel AI Flask Server...
Loading YOLOv8 model...
✓ Using CPU for inference (or GPU if available)
YOLOv8 model loaded successfully!
Server running on http://localhost:5001
```

### Step 3: Start Frontend
```bash
# Terminal 2 - Start React frontend  
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

## Verify Everything Works

### Test 1: Backend Health Check
```bash
curl http://localhost:5001/api/health
```

Expected: `{"status":"healthy"}`

### Test 2: YOLOv8 Setup
```bash
python3 server/test_yolo_setup.py
```

Expected: All tests pass ✓

### Test 3: Open Application
1. Open browser to `http://localhost:5173`
2. Click **"Live View"** in navigation
3. Wait for status indicators:
   - ✓ Backend Connected
   - ✓ Video Loaded  
   - ✓ Detection Active
4. You should see real-time people detection!

## Using the Live View

### Basic Operation
1. **Automatic Detection**: Starts automatically when page loads
2. **View Annotated Feed**: Toggle "🎯 YOLO Feed" button (top right)
3. **Adjust Settings**: Use sliders in "Detection Overview" panel
   - Confidence Threshold (0.5 recommended)
   - IoU Threshold (0.45 recommended)
4. **Monitor Stats**: Watch live people count and FPS

### Controls
- **Toggle Feed**: Switch between annotated and original video
- **Start/Stop Detection**: Manual control of detection
- **Confidence Slider**: Adjust detection sensitivity
- **IoU Slider**: Control box overlap handling
- **Full Analysis**: Run comprehensive analysis with heatmap

### Feed Modes
**🎯 YOLO Feed (Recommended)**
- Shows frames with drawn bounding boxes
- CCTV overlay with timestamp/count/FPS
- Fully annotated by backend

**📹 Original Feed**
- Shows original video
- Manual overlay with detection boxes
- Good for comparison

## Quick Demo

### Standalone Detection Script
```bash
# Real-time webcam detection
python3 server/yolo_realtime_detection.py --source webcam

# Process video file
python3 server/yolo_realtime_detection.py --source public/assets/demo_video.mp4

# Save annotated output
python3 server/yolo_realtime_detection.py --source demo_video.mp4 --output result.mp4
```

### Interactive Demos
```bash
python3 demo_detection.py
```

Choose from:
1. Simple Webcam Detection
2. Video File Detection
3. Save Annotated Output
4. Custom Frame-by-Frame Processing
5. Parameter Comparison

## Troubleshooting

### "Backend Not Connected"
```bash
# Check if Flask is running
lsof -i :5001

# If not running, start it
python3 server/app.py
```

### "Video Not Loading"
```bash
# Check video exists
ls -lh public/assets/demo_video.mp4

# If missing, add your own video
cp your_video.mp4 public/assets/demo_video.mp4
```

### Import Errors
```bash
# Reinstall dependencies
cd server
pip3 install -r requirements.txt --upgrade

# Verify
python3 -c "import torch; from ultralytics import YOLO; import cv2; print('✓ All OK')"
```

### CORS Errors
- Clear browser cache
- Restart both servers
- Check Flask-CORS is installed

### Low FPS
- Check GPU is detected (backend logs)
- Increase confidence threshold
- Reduce video resolution

## System Architecture

```
Frontend (React)              Backend (Flask)
─────────────────             ───────────────
LiveView Component     →      /api/yolo/initialize
  ↓                             ↓
Request frame         →      Process frame with YOLOv8
  ↓                             ↓
Receive annotated     ←      Return base64 frame + data
frame                           ↓
  ↓                         Draw boxes + CCTV overlay
Display in UI                   ↓
  ↓                         Calculate FPS
Update stats                    ↓
  ↓                         Track detections
Loop every 500ms    →      Ready for next frame
```

## Performance Expectations

| Hardware | FPS | Status |
|----------|-----|--------|
| GPU (NVIDIA) | 30-60 | Optimal ⚡ |
| GPU (AMD/Apple) | 20-40 | Good ✓ |
| CPU (Modern) | 5-15 | Acceptable ✓ |
| CPU (Old) | 2-5 | Slow ⚠️ |

## Default Configuration

```javascript
{
  confidence_threshold: 0.5,  // 50% minimum confidence
  iou_threshold: 0.45,        // 45% overlap for NMS
  use_gpu: true,              // Auto-detect GPU
  frame_skip: 10,             // Process every 10th frame
  request_interval: 500       // 500ms between requests
}
```

## Available Endpoints

### YOLOv8 Detection
- `POST /api/yolo/initialize` - Initialize model
- `POST /api/yolo/process-frame` - Process single frame
- `GET /api/yolo/stream?source=video|webcam` - Stream detection
- `POST /api/yolo/webcam/detect` - Webcam frame detection
- `GET/POST /api/yolo/config` - Get/update config
- `POST /api/yolo/analyze-video` - Full video analysis
- `GET /api/yolo/video-info` - Video file info

### AI Assistant
- `POST /api/chat` - Chat with AI about locations
- `GET/POST /api/profile` - User profile management
- `GET /api/health` - Server health check

## File Structure

```
Landscapes/
├── server/
│   ├── app.py                        # Flask backend with YOLOv8
│   ├── yolo_realtime_detection.py   # Standalone detection script
│   ├── test_yolo_setup.py           # Setup verification
│   ├── requirements.txt              # Python dependencies
│   └── yolov8n.pt                   # Model (auto-downloaded)
│
├── src/
│   └── components/
│       └── liveView/
│           ├── LiveView.jsx          # Live detection UI
│           └── LiveView.css          # Styles
│
├── public/
│   └── assets/
│       └── demo_video.mp4           # Demo video (user provided)
│
└── Documentation/
    ├── YOLO_DETECTION_GUIDE.md      # Comprehensive guide
    ├── LIVE_VIEW_SETUP.md            # Live View integration
    ├── README_DETECTION.md           # Quick reference
    └── START_SYSTEM.md               # This file
```

## Development Mode

### Hot Reload
- Frontend: Changes auto-reload
- Backend: Restart server after changes

### Debug Logging
```javascript
// Frontend - Browser console
// Backend - Terminal output
```

### Testing Changes
1. Make code changes
2. Save file
3. Refresh browser (frontend) or restart server (backend)
4. Test in Live View

## Production Deployment

### Build Frontend
```bash
npm run build
```

### Run Production Server
```bash
# Use gunicorn for production
gunicorn -w 4 -b 0.0.0.0:5001 server.app:app
```

### Environment Variables
Create `.env` file:
```
HUGGINGFACE_API_KEY=your_key_here
FLASK_ENV=production
```

## Support & Resources

### Documentation
- `YOLO_DETECTION_GUIDE.md` - Full detection guide
- `LIVE_VIEW_SETUP.md` - Live View integration
- `YOLO_SETUP.md` - Initial setup guide
- `TROUBLESHOOTING.md` - Common issues

### External Resources
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [OpenCV Documentation](https://docs.opencv.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)

## Summary

✅ **Installed**: All dependencies
✅ **Started**: Backend + Frontend servers  
✅ **Verified**: System working correctly
✅ **Using**: Live View with YOLOv8 detection

**You're ready to go!** 🎉

Navigate to Live View and watch real-time people detection in action.
