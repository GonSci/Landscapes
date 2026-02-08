# Live View Troubleshooting Guide

## Issue: Video Not Moving

### Checklist:
1. **Video file exists**: Ensure `demo_video.mp4` is in `/public/assets/demo_video.mp4`
2. **Video format**: Use MP4 with H.264 codec (most compatible)
3. **Browser console**: Check for errors (F12 → Console tab)

### Quick Fixes:

#### Fix 1: Check Video File Location
```bash
# From project root
ls -la public/assets/demo_video.mp4
```
If file doesn't exist, place your video there.

#### Fix 2: Check Browser Console
Open Developer Tools (F12) and look for:
- ❌ `404 Not Found` → Video file missing
- ❌ `Failed to load video` → Wrong file format or corrupted
- ❌ `CORS error` → Backend not running

#### Fix 3: Browser Autoplay Policy
Some browsers block autoplay. The video should have:
- ✅ `muted` attribute (already set)
- ✅ `autoPlay` attribute (already set)
- ✅ `playsInline` for mobile (already set)

If still blocked, click anywhere on the page to trigger playback.

---

## Issue: No Detection / YOLOv8 Not Working

### Checklist:
1. **Backend running**: Flask server must be active on port 5001
2. **Dependencies installed**: All Python packages installed in venv
3. **Video contains people**: YOLOv8 only detects people (class 0)

### Quick Fixes:

#### Fix 1: Start Backend Server
```bash
cd server
source venv/bin/activate
python app.py
```

You should see:
```
Loading YOLOv8 model...
YOLOv8 model loaded successfully!
Server running on http://localhost:5001
```

#### Fix 2: Test Backend Connection
Open http://localhost:5001/api/health in your browser.

Expected response:
```json
{
  "status": "healthy",
  "message": "Travel AI API is running"
}
```

#### Fix 3: Check Network Tab
1. Open DevTools (F12) → Network tab
2. Click "Start Crowd Detection"
3. Look for requests to:
   - `POST /api/yolo/initialize` → Should return 200
   - `POST /api/yolo/process-frame` → Should return 200 with detections

If you see:
- ❌ `Failed to fetch` → Backend not running
- ❌ `404 Not Found` → Endpoint missing (check app.py)
- ❌ `500 Internal Server Error` → Check backend terminal for Python errors

#### Fix 4: Verify Video Has People
YOLOv8 is trained to detect people. If your video doesn't contain people, there will be no detections.

Test with a sample video:
- Download a crowd video from https://pixabay.com/videos/search/crowd/
- Save as `demo_video.mp4` in `public/assets/`

---

## Issue: Detection Boxes Not Appearing

### Possible Causes:

1. **Zero detections**: Video frame has no people
   - Check backend logs: Should show `Detected X people in first frame`
   - Try a different frame or video

2. **Bounding boxes off-screen**: Coordinates might be incorrect
   - Check console: `Detection result:` should show detection array
   - Verify `x, y, width, height` are in valid range (0-100%)

3. **CSS issue**: Detection boxes may be hidden
   - Check that `.detection-box.detected` has proper styling
   - Verify z-index and position are correct

### Debug Steps:

#### Step 1: Check Backend Logs
In the terminal running Flask, you should see:
```
Processing frame 0...
Detected 8 people in frame
```

#### Step 2: Check Browser Console
Should show:
```
Processing frame 0...
Detection result: {count: 8, detections: [...]}
```

#### Step 3: Verify Detection Data
In browser console, check the detection object:
```javascript
// Should see something like:
{
  x: 25.5,      // % from left
  y: 30.2,      // % from top
  width: 8.3,   // % width
  height: 15.7, // % height
  confidence: 0.87
}
```

---

## System Status Indicators

The page shows status badges:

### ✓ Backend Connected (Green)
- Flask server is running and responding
- YOLOv8 initialized successfully

### ⏳ Connecting to Backend... (Orange)
- Flask server not responding
- **Action**: Start Flask server: `cd server && source venv/bin/activate && python app.py`

### ✓ Video Loaded (Green)
- Video file found and loaded
- Video ready to play

### ⏳ Loading Video... (Orange)
- Video file not found or still loading
- **Action**: Ensure `demo_video.mp4` exists in `public/assets/`

---

## Common Issues

### Issue: "Failed to connect to backend"
**Cause**: Flask server not running on port 5001

**Solution**:
```bash
cd server
source venv/bin/activate
python app.py
```

---

### Issue: "Video file not found"
**Cause**: demo_video.mp4 missing from public/assets

**Solution**:
1. Place video in `/public/assets/demo_video.mp4`
2. Refresh browser
3. Check file permissions (must be readable)

---

### Issue: "Port 5001 already in use"
**Cause**: macOS AirPlay Receiver or another process using port 5001

**Solution 1 - Disable AirPlay Receiver**:
1. System Preferences → Sharing
2. Uncheck "AirPlay Receiver"

**Solution 2 - Use Different Port**:
1. Edit `server/app.py` line 280: Change `port=5001` to `port=5002`
2. Edit `src/components/liveView/LiveView.jsx` line 6:  
   Change `http://localhost:5001` to `http://localhost:5002`

---

### Issue: Detection very slow
**Cause**: High resolution video or slow computer

**Solutions**:
1. Use lower resolution video (720p recommended)
2. Increase frame skip interval in LiveView.jsx line 101:
   ```javascript
   frameNumber += 30; // Skip more frames (faster but less frequent updates)
   ```
3. Use YOLOv8n (nano) model - already configured as default

---

### Issue: YOLOv8 model download fails
**Cause**: No internet connection or firewall blocking

**Solution**:
1. Ensure internet connection
2. Manually download model:
   ```bash
   cd server
   source venv/bin/activate
   python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
   ```
3. Model saved to `~/.config/Ultralytics/` automatically

---

## Testing Workflow

Follow this sequence to ensure everything works:

1. **Start Backend**:
   ```bash
   cd server
   source venv/bin/activate
   python app.py
   ```
   ✅ Should see "Server running on http://localhost:5001"

2. **Start Frontend**:
   ```bash
   npm run dev
   ```
   ✅ Should open browser at http://localhost:5173

3. **Navigate to Live View**:
   - Click "Live View" in navigation menu
   - ✅ Should see green status badges
   - ✅ Video should be playing automatically

4. **Test Detection**:
   - Click "Start Crowd Detection"
   - ✅ Progress bar should animate 0% → 100%
   - ✅ Green detection boxes should appear on people
   - ✅ Statistics should update with real numbers

5. **Check Results**:
   - ✅ People count updates in real-time
   - ✅ Detection boxes have confidence % labels
   - ✅ If 20+ people detected, heatmap appears
   - ✅ Tourist redirection suggestions show for crowded locations

---

## Still Having Issues?

### Check Everything:

Run the test script:
```bash
cd server
source venv/bin/activate
python test_yolo_setup.py
```

This will verify:
- ✓ All dependencies installed
- ✓ Video file exists and readable
- ✓ YOLOv8 model loads
- ✓ Detection works on video

### Enable Debug Mode:

In `LiveView.jsx`, all console.log statements are already enabled. Check browser console (F12) for detailed logs:
- Video loading status
- API requests and responses
- Detection results with coordinates
- Error messages

### Get Help:

If none of the above works:
1. Open browser console (F12)
2. Copy all error messages
3. Check backend terminal for Python errors
4. Verify all status indicators on the page
