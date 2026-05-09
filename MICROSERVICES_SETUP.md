# Microservices Architecture Setup Guide

This document explains how to run the refactored backend as two independent microservices.

## Architecture Overview

### 1. **vision_worker.py** - Vision Processing Service

- **Purpose**: Continuously processes video frames using YOLOv8 detection
- **Responsibilities**:
  - Initialize YOLOv8 model
  - Read video streams
  - Run YOLO detection/tracking on each frame
  - Write detection results (people counts) to PostgreSQL `SurveillanceLog` table
- **No HTTP server** - runs independently
- **Database**: Writes only to `SurveillanceLog` table
- **Imports**: OpenCV, YOLOv8, threading, database models

### 2. **api_server.py** - REST API Service

- **Purpose**: Handles all HTTP requests and TOPSIS calculations
- **Responsibilities**:
  - Serve REST API endpoints
  - Handle user authentication
  - Query `SurveillanceLog` for latest crowd data
  - Run TOPSIS algorithm for location recommendations
  - Return Top 3 locations based on travel time & crowd density
- **No frame processing** - read-only from database
- **Database**: Reads from `SurveillanceLog`, `Location`, `User` tables
- **Imports**: Flask, CORS, database models (NO cv2, NO ultralytics)

### 3. **PostgreSQL Database** - The Bridge

- `SurveillanceLog` table: Latest detection results written by vision_worker
- `Location` table: Available destinations
- `User` table: Authentication data
- Enables async communication between both services

## Setup Instructions

### Step 1: Install Dependencies

Ensure you have all required packages installed:

```bash
cd /Users/YOUR_PC_NAME/Developer/Landscapes/backend
pip install -r requirements.txt
```

Required packages:

- `flask`, `flask-cors`
- `sqlalchemy`, `psycopg2-binary`
- `python-dotenv`
- `ultralytics` (YOLOv8) - only used in vision_worker
- `opencv-python` (cv2) - only used in vision_worker

### Step 2: Start PostgreSQL

Ensure PostgreSQL is running and the database is initialized:

```bash
# Create database (if not already created)
psql -U landscapes_user -c "CREATE DATABASE landscapes;"

# Or verify existing database
psql -U landscapes_user -d landscapes -c "\dt"
```

### Step 3: Terminal 1 - Start the Vision Worker

```bash
cd /Users/skies/Developer/Landscapes/backend
python3 vision_worker.py
```

**Expected output:**

```
[VISION] Loading YOLOv8 model...
[VISION] ✓ GPU detected, using CUDA acceleration
[VISION] YOLOv8 model loaded successfully!
[VISION] Starting vision processing loop for: /path/to/demo_video.mp4
[VISION] Video info: 1500 frames @ 30 FPS
[VISION] Logged 12 people for Baguio Night Market
[VISION] Logged 8 people for The Mansion
...
```

**What it does:**

- Loads YOLOv8 model (`best.pt`)
- Continuously reads video frames
- Detects people in each frame
- Logs crowd counts to `SurveillanceLog` table (every 60s or when high density detected)

**To stop:** Press `Ctrl+C`

### Step 4: Terminal 2 - Start the API Server

```bash
cd /Users/skies/Developer/Landscapes/backend
python3 api_server.py
```

**Expected output:**

```
[API] Starting Travel AI REST API Server...
[API] Server running on http://localhost:5001
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5001
```

**What it does:**

- Initializes Flask app
- Starts HTTP server on port 5001
- Ready to receive requests from frontend

### Step 5: Terminal 3 - Start the Frontend

```bash
cd /Users/skies/Developer/Landscapes/frontend
npm run dev
```

Runs on `http://localhost:5173`

---

## Using the Services

### Example: Get Location Recommendations

**Frontend Redirection Component** sends POST request:

```json
{
  "start_location_id": 1,
  "start_coords": [16.4023, 120.596],
  "max_travel_time": 15,
  "travel_mode": "walking",
  "group_size": 2,
  "environment": "any",
  "place_category": "dining",
  "paid_attractions": false
}
```

**Flow:**

1. Frontend sends request to `http://localhost:5001/api/redirection`
2. API Server (api_server.py) receives the request
3. API queries `SurveillanceLog` for latest crowd data (written by vision_worker)
4. API applies TOPSIS algorithm with 50/50 weights (travel time vs crowd)
5. API returns Top 3 recommendations with scores

**Response:**

```json
{
  "top_3_results": [
    {
      "location_id": 3,
      "name": "Baguio Midland Roses",
      "type": "Dining",
      "distance": 2.5,
      "travel_time_minutes": 18.5,
      "crowd_level": 35.2,
      "topsis_score": 0.8234,
      "latitude": 16.3950,
      "longitude": 120.5920
    },
    ...
  ],
  "total_considered": 4,
  "total_locations": 5
}
```

---

## Communication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  FRONTEND (React)                                               │
│  ├─ Redirection.jsx                                             │
│  └─ Sends POST /api/redirection with preferences                │
│     │                                                           │
│     ├─────────────────────────────────────┐                     │
│     │                                     │                     │
│     ▼                                     ▼                     │
│  ┌──────────────┐                  ┌──────────────┐             │
│  │ API Server   │                  │ Vision       │             │
│  │ (port 5001)  │◄────────────────►│ Worker       │             │
│  │              │   PostgreSQL     │ (async)      │             │
│  │ • TOPSIS     │   Database       │              │             │
│  │ • User Auth  │                  │ • YOLOv8     │             │
│  │ • REST API   │                  │ • Frame Loop │             │
│  └──────────────┘                  └──────────────┘             │
│     ▲                                     │                     │
│     │                                     ▼                     │
│     │                              ┌──────────────┐             │
│     │                              │ Video Stream │             │
│     │                              │  place.mp4   │             │
│     │                              └──────────────┘             │
│     │                                                           │
│     └──────► Returns Top 3 results                              │
│                                                                 │
│  PostgreSQL Database:                                           │
│  ├─ SurveillanceLog (writes from vision_worker)                 │
│  ├─ Location (read by api_server)                               │
│  └─ User (read/write by api_server)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Connection Pooling

Both services use SQLAlchemy's built-in connection pooling:

- **Vision Worker**: Opens connection in Flask context, uses same connection for all logging
- **API Server**: Handles concurrent requests with separate connections from pool
- **Default Pool Size**: 5 connections (adjustable via `pool_size` parameter)

No explicit connection locks needed - PostgreSQL handles row-level locking automatically.

---

## Configuration

### Video Selection (vision_worker.py)

Edit the `__main__` section of `vision_worker.py`:

```python
if __name__ == '__main__':
    # ...
    if initialize_vision_worker('demo_video.mp4', location_id=1):
        # location_id: Which location to associate with this video
        # Options: 1=Night Market, 2=Mansion, 3=Cathedral, etc.
```

### Database Connection

Both services read from `.env`:

```env
DATABASE_URL=postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes
```

### TOPSIS Weights

In `api_server.py`, line ~320:

```python
weights = [0.5, 0.5]  # [travel_time, crowd_density]
```

Change to your preferred weights (must sum to 1.0)

### Terrain Multiplier (Baguio)

In both files:

```python
TERRAIN_MULTIPLIER = 1.4  # Mountainous terrain adjustment
```

---

## Monitoring & Debugging

### Vision Worker Logs

Look for `[VISION]` prefix:

```
[VISION] Loading YOLOv8 model...
[VISION] Logged 15 people for Baguio Night Market
[VISION] Skipping log for location X: Low confidence
```

### API Server Logs

Look for `[API]` prefix:

```
[API] Received TOPSIS request: {...}
[API] Found 5 locations in database
[API] Top 3 results: [...]
```

### Database Inspection

```bash
# Check latest detections
psql -U landscapes_user -d landscapes -c "
  SELECT location_name, people_count, timestamp
  FROM surveillance_log
  ORDER BY timestamp DESC
  LIMIT 10;
"

# Check location data
psql -U landscapes_user -d landscapes -c "
  SELECT id, name, latitude, longitude
  FROM location
  LIMIT 5;
"
```

---

## Stopping the Services

**Stop vision_worker (Terminal 1):**

```bash
Ctrl+C
```

Cleanly closes video capture and database connections.

**Stop api_server (Terminal 2):**

```bash
Ctrl+C
```

Cleanly shuts down Flask.

**Stop frontend (Terminal 3):**

```bash
Ctrl+C
```

---

## Troubleshooting

### Issue: "No locations available in database"

**Solution:** Ensure `Location` table is populated. Run:

```bash
python3 backend/create_db.py
```

### Issue: Vision worker logs nothing

**Possible causes:**

- Video file not found (check resolve_video_path)
- YOLOv8 model not found (`best.pt` missing)
- No people detected in video

### Issue: API returns 500 error on /api/redirection

**Check:**

1. Vision worker is running and populating `SurveillanceLog`
2. Database connectivity: `psql -U landscapes_user -d landscapes -c "SELECT COUNT(*) FROM surveillance_log;"`
3. API server logs for error messages

### Issue: "Connection refused" between services

**Ensure:**

1. PostgreSQL is running: `psql -U landscapes_user -d landscapes -c "\dt"`
2. Both services use same `DATABASE_URL`
3. No firewall blocking localhost connections

---

## Next Steps

1. ✅ Run both services as shown above
2. ✅ Verify database is being populated (check `SurveillanceLog` table)
3. ✅ Test frontend's Redirection component
4. ✅ Monitor logs for `[VISION]` and `[API]` prefixes
5. ✅ Adjust TOPSIS weights or terrain multiplier as needed

---

## Environment Variables

Create `.env` file in `/backend`:

```env
DATABASE_URL=postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes
FLASK_DEBUG=true
```

---
