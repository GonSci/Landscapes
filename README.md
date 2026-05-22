# Landscapes

Landscapes is a crowd-monitoring web app for Baguio locations, enabling real-time detection and intelligent TOPSIS-based redirection for crowd distribution.

- **Frontend**: React + Vite + Tailwind CSS
- **Backend (API)**: Flask + PostgreSQL
- **Backend (Vision)**: YOLOv8 + OpenCV for real-time people detection

This file is the main setup guide for the microservices architecture, replacing the old monolithic setup.

## Project Structure

```text
Landscapes/
├── frontend/                  # React app
│   ├── src/
│   └── public/assets/         # Place demo_video.mp4 here
├── backend/                   # Microservices backend
│   ├── api_server.py          # REST API & TOPSIS logic
│   ├── vision_worker.py       # YOLOv8 inference & Database logger
│   ├── models.py              # PostgreSQL schema
│   ├── requirements.txt
│   ├── reset_db.py            # Script to wipe database
│   └── create_db.py           # Script to initialize and seed database
```

## Prerequisites

Install these first:

- Git
- Node.js 18+ (includes npm)
- Python 3.10+
- PostgreSQL (running locally)

Check versions:

```bash
node -v
npm -v
python3 --version
```

On Windows, `python3` may be `py` or `python`.

## Step 1: Clone the Repository

```bash
git clone https://github.com/GonSci/Landscapes.git
cd Landscapes
```

## Step 2: PostgreSQL Database Setup

The backend uses PostgreSQL for user accounts, location data, and surveillance logs. **You must have PostgreSQL running locally.**

1. **Install PostgreSQL**:
   - **macOS**: `brew install postgresql@14`
   - **Windows**: Download the installer from EnterpriseDB.
2. **Start the Service**:
   - **macOS**: `brew services start postgresql@14`
   - **Windows**: Ensure the PostgreSQL service is running in `services.msc`.
3. **Initialize Database and User**:
   Open your terminal (or `psql` shell) and run:

   ```sql
   -- Create the database
   CREATE DATABASE landscapes;

   -- Create the specialized user
   CREATE USER landscapes_user WITH ENCRYPTED PASSWORD 'landscapes_pass123';

   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE landscapes TO landscapes_user;

   -- CRITICAL for PostgreSQL 15+: Ensure the user owns the schema
   ALTER DATABASE landscapes OWNER TO landscapes_user;
   ```

## Step 3: Setup Backend Environment

1. **Environment Configuration**:
   - Copy `backend/.env.example` to `backend/.env` (or create one):
     ```env
     DATABASE_URL=postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes
     FLASK_DEBUG=true
     ```

2. **Install Dependencies**:

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Initialize Database Tables & Seed Locations**:
   You must initialize the tables and seed the `Location` data (Baguio Night Market, Wright Park, The Mansion, etc.). **If you skip this, the map and explore pages will be empty.**

   ```bash
   python3 reset_db.py   # (Optional) Only if you need to wipe existing tables
   python3 create_db.py  # Creates tables and seeds initial location data
   ```

4. **Verify AI Model**:
   Ensure `backend/best.pt` exists. This is your fine-tuned YOLOv8 model used for people detection.

## Step 4: Run the Microservices

The new architecture splits the backend into two independent services communicating via PostgreSQL. You need to run them in separate terminals.

### Terminal 1 - API Server

Handles all REST endpoints, user authentication, and TOPSIS crowd-aware redirection algorithms.

```bash
cd backend
source venv/bin/activate
python3 api_server.py
```

_Runs on `http://localhost:5001`_

### Terminal 2 - Vision Worker

Continuously runs the YOLOv8 model on the video feed and logs crowd counts to the database asynchronously.

```bash
cd backend
source venv/bin/activate
python3 vision_worker.py
```

_No HTTP interface. Press `Ctrl+C` to stop._

## Step 5: Setup and Run Frontend

1. **Environment Configuration (Optional for Local Development)**:
   - If you are just testing on your own computer, you do **not** need a `.env` file. The frontend will automatically fall back to using `localhost`.
   - **If you want to test on other devices (like your mobile phone) on the same Wi-Fi network:**
     1. Copy `frontend/.env.example` to `frontend/.env`.
     2. Open the file and replace `localhost` with your computer's actual local IP address (e.g., `192.168.1.8`).
        ```env
        VITE_API_BASE_URL=http://192.168.1.x:5001
        VITE_VISION_BASE_URL=http://192.168.x.8:5002
        ```

2. **Run the React frontend in Terminal 3**:

   ```bash
   cd frontend
   npm install

   # For standard local testing:
   npm run dev

   # Or, if testing on mobile devices on your network:
   npm run dev -- --host
   ```

Expected frontend URL: `http://localhost:5173` (or `3000` depending on Vite config).

## Video Requirement (Important)

For the Vision Worker and Live View to function, ensure your sample video is correctly placed:

- `frontend/public/assets/demo_video.mp4`

## System Architecture Flow

1. **Vision Worker (`vision_worker.py`)** runs YOLO tracking on `demo_video.mp4` and writes the `people_count` to the `SurveillanceLog` PostgreSQL table.
2. **API Server (`api_server.py`)** receives POST requests from the Frontend for recommendations.
3. **API Server** queries the latest `SurveillanceLog` data, applies the 50/50 TOPSIS algorithm (Crowd vs. Distance), and returns the optimal locations.
4. **React Frontend** dynamically visualizes the interactive map and the UI dashboard cards.

## Database Management

To easily manage or reset your database tables, you can use the provided scripts in the `backend/` directory:

- **Reset Database**: Run `python3 reset_db.py` to drop all tables and wipe the database.
- **Create & Seed Database**: Run `python3 create_db.py` to create the tables and populate them with the initial location data.

## Common Fixes

### 1) "python: command not found" (macOS)

Use `python3` instead of `python`.

### 2) "ModuleNotFoundError: No module named flask"

You are likely not in the backend virtual environment. Ensure you run `source venv/bin/activate` before running the scripts.

### 3) "No locations available in database"

You forgot to seed the database. Ensure you run `python3 create_db.py`.

### 4) "Connection refused" between services

Ensure PostgreSQL is actually running and the `DATABASE_URL` in your `.env` matches your local credentials.
