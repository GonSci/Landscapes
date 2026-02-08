# YOLOv8 Crowd Detection Setup Guide

This guide will help you set up real-time crowd detection using YOLOv8 for the Live View feature.

## Prerequisites

- Python 3.8 or higher
- Node.js and npm (already installed)
- demo_video.mp4 file with people in it

## Step 1: Install Python Dependencies

Navigate to the project directory and install the required Python packages:

```bash
cd server
pip install -r requirements.txt
```

This will install:
- Flask & Flask-CORS (backend server)
- ultralytics (YOLOv8 library)
- opencv-python (video processing)
- torch & torchvision (deep learning framework)
- numpy & pillow (image processing)

**Note:** The first time you run YOLOv8, it will automatically download the pre-trained model (yolov8n.pt, ~6MB).

## Step 2: Place Your Demo Video

1. Place your `demo_video.mp4` file in the `public/assets` folder:
   ```
   Landscapes/
   ├── public/
   │   └── assets/
   │       └── demo_video.mp4  <-- Place video here
   ```

2. The video should contain people for YOLOv8 to detect
3. Recommended: MP4 format, H.264 codec, reasonable resolution (720p or 1080p)

## Step 3: Start the Backend Server

Open a new terminal and start the Flask server:

```bash
cd server
python app.py
```

You should see:
```
Loading YOLOv8 model...
YOLOv8 model loaded successfully!
Starting Travel AI Flask Server...
Server running on http://localhost:5001
```

**Troubleshooting:**
- If you get "Port 5001 already in use", change the port in `server/app.py` (last line)
- On macOS, port 5001 may conflict with AirPlay Receiver - disable it in System Preferences

## Step 4: Start the React Frontend

In a separate terminal:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Step 5: Test the Live View Feature

1. Navigate to "Live View" from the menu
2. Select a location from Baguio
3. Click "Start Crowd Detection"
4. Watch as:
   - The video plays with real-time detection
   - Green bounding boxes appear around detected people
   - Detection count updates in real-time
   - Statistics show accurate numbers
   - If 20+ people detected, CSRNet heatmap is generated
   - Tourist redirection suggestions appear for crowded locations

## How It Works

### Backend (Python/Flask):
1. **YOLOv8 Initialization**: Loads the pre-trained YOLOv8n (nano) model for fast inference
2. **Frame Processing**: Extracts frames from the video file
3. **Person Detection**: YOLOv8 detects people (class 0) in each frame
4. **API Responses**: Returns detection data (bounding boxes, confidence, count) as JSON

### Frontend (React):
1. **Video Display**: HTML5 video element plays demo_video.mp4
2. **API Calls**: Fetches detection results from Flask backend every 300ms
3. **Visual Overlay**: Draws green bounding boxes based on real YOLOv8 coordinates
4. **Statistics Update**: Shows actual detected count, density percentage, crowd level
5. **CSRNet Heatmap**: Generated when 20+ people detected
6. **Tourist Redirection**: Suggests alternative locations when overcrowded

## API Endpoints

- `POST /api/yolo/initialize` - Initialize YOLOv8 model and set video path
- `POST /api/yolo/process-frame` - Process a single frame and return detections
- `POST /api/yolo/analyze-video` - Analyze entire video for statistics
- `GET /api/yolo/video-info` - Get video metadata (fps, duration, dimensions)
- `GET /api/yolo/stream` - Stream real-time detection (Server-Sent Events)

## Performance Tips

1. **Model Selection**: Using `yolov8n.pt` (nano) for fastest inference
   - For better accuracy, use `yolov8m.pt` or `yolov8x.pt` (slower)
   - Update model name in `server/app.py` line 28

2. **Frame Sampling**: Currently processes every 10th frame (line 89 in LiveView.jsx)
   - Increase for faster processing but less frequent updates
   - Decrease for smoother detection but higher CPU usage

3. **Video Resolution**: Lower resolution = faster processing
   - Recommended: 720p (1280x720)
   - Not recommended: 4K (too slow for real-time)

## Troubleshooting

### "Video file not found" error:
- Ensure `demo_video.mp4` is in `public/assets/` folder
- Check file name spelling (case-sensitive on Linux/Mac)

### "Cannot connect to backend server":
- Ensure Flask server is running on port 5001
- Check terminal for errors in Flask server
- Try accessing http://localhost:5001/api/health in your browser

### "Failed to initialize YOLOv8 model":
- Ensure PyTorch is installed: `pip show torch`
- Check if you have internet connection (for first-time model download)
- Try manually downloading: `yolo task=detect mode=predict model=yolov8n.pt`

### Detection boxes not appearing:
- Ensure video contains people
- Check browser console for JavaScript errors
- Verify backend is returning detections: check Flask terminal logs

### Slow performance:
- Reduce video resolution
- Increase frame skip interval (line 89 in LiveView.jsx)
- Use faster YOLOv8 model (yolov8n is already the fastest)
- Close other applications to free up CPU/GPU

## Testing Your Setup

Run this test to verify everything works:

```bash
# In server directory
python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('YOLOv8 ready!')"
```

If you see "YOLOv8 ready!", you're all set!

## Next Steps

- Replace `demo_video.mp4` with actual footage from Baguio locations
- Fine-tune detection threshold for crowded vs non-crowded classification
- Add more locations to `baguio_locations.json`
- Implement CSRNet density estimation for more accurate crowd counting
- Deploy to production with proper video streaming infrastructure

## Credits

- **YOLOv8**: Ultralytics (https://github.com/ultralytics/ultralytics)
- **Computer Vision**: OpenCV
- **Deep Learning**: PyTorch
