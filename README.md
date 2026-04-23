# Landscapes

Landscapes is a crowd-monitoring web app for Baguio locations.

- Frontend: React + Vite
- Backend: Flask + YOLOv8
- Live View: Real-time people detection from demo video or webcam

This file is the main setup guide for teammates using macOS or Windows.

## Project Structure

```text
Landscapes/
├── frontend/                  # React app
│   ├── src/
│   └── public/assets/
├── backend/                   # Flask + YOLO endpoints
│   ├── app.py
│   ├── requirements.txt
│   └── test_yolo_setup.py
└── start.bat                  # Optional Windows helper script
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

## Step 2: Setup and Run Backend

Run backend in Terminal/Window 1.

### macOS

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
python3 create_db.py
python3 app.py
```

### Windows PowerShell

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python create_db.py
python app.py
```

### Windows Command Prompt

```bat
cd backend
py -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python create_db.py
python app.py
```

### PostgreSQL Database Setup

The backend now uses PostgreSQL for authentication and persistent surveillance logging. You must install and run PostgreSQL locally.

1. Install PostgreSQL (macOS: `brew install postgresql@14`, Windows: Download from EnterpriseDB).
2. Start the PostgreSQL service.
3. Create the database and user with the following `psql` commands:
   ```sql
   CREATE DATABASE landscapes;
   CREATE USER landscapes_user WITH ENCRYPTED PASSWORD 'landscapes_pass123';
   GRANT ALL PRIVILEGES ON DATABASE landscapes TO landscapes_user;
   -- Important for PostgreSQL 15+
   ALTER DATABASE landscapes OWNER TO landscapes_user;
   ```
4. Run the database initialization script before starting `app.py`:
   ```bash
   python create_db.py
   ```
*(Note: If you run into schema issues later, you can use `python fix_db.py` to recreate tables.)*

Expected backend URL:

- http://localhost:5001

## Step 3: Setup and Run Frontend

Run frontend in Terminal/Window 2.

### macOS

```bash
cd frontend
npm install
npm run dev
```

### Windows PowerShell / CMD

```powershell
cd frontend
npm install
npm run dev
```

Expected frontend URL:

- http://localhost:3000

## Step 4: Verify the App

1. Check backend health:

```bash
curl http://localhost:5001/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "message": "Travel AI API is running"
}
```

2. Open frontend URL in browser.
3. Go to Live View and start detection.

## Video Requirement (Important)

For Live View video mode, make sure this file exists:

- `frontend/public/assets/demo_video.mp4`

Check quickly:

### macOS

```bash
ls -lah frontend/public/assets/demo_video.mp4
```

### Windows PowerShell

```powershell
Get-Item frontend/public/assets/demo_video.mp4
```

## Optional: Windows One-Command Startup

From repo root, you can run:

```bat
start.bat
```

It will install missing dependencies and start both backend and frontend.

## Environment Variables

For current setup, `.env` is optional.

- Template is available at `backend/.env.example`
- No Hugging Face API key is required

## Common Fixes

### 1) "python: command not found" (macOS)

Use `python3` instead of `python`.

### 2) "ModuleNotFoundError: No module named flask"

You are likely not in the backend virtual environment.

```bash
cd backend
source venv/bin/activate
python3 -m pip install -r requirements.txt
```

### 3) "Video file not found"

Ensure the file is in:

- `frontend/public/assets/demo_video.mp4`

### 4) Port 5001 already in use

Stop the conflicting process or change backend port in `backend/app.py`.

## Team Pull Workflow

When teammates pull new changes:

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
source venv/bin/activate    # Windows: venv\Scripts\activate
python3 -m pip install -r requirements.txt
python3 create_db.py        # Update database schema if needed
```

Then run backend and frontend again.
