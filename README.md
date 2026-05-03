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

The backend uses PostgreSQL for user accounts, location data, and surveillance logs. You must have PostgreSQL running locally.

1. **Install PostgreSQL**:
   - **macOS**: `brew install postgresql@14`
   - **Windows**: Download the installer from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
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

### Backend Setup (Step-by-Step)

1. **Environment Configuration**:
   - Copy `backend/.env.example` to `backend/.env`:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Verify the `DATABASE_URL` in `.env` matches your local PostgreSQL credentials.

2. **Install Dependencies**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Initialize Database Tables**:
   This script creates the actual tables in your PostgreSQL database:
   ```bash
   python3 create_db.py
   ```

4. **Seed Location Data (CRITICAL)**:
   This step populates the `locations` table with the actual Baguio places (Night Market, The Mansion, etc.). **If you skip this, the map and explore pages will be empty.**
   ```bash
   python3 run_migration.py
   ```

5. **Verify AI Model**:
   Ensure `backend/best.pt` exists. This is the YOLOv8 model used for people detection.

6. **Start the Server**:
   ```bash
   python3 app.py
   ```
   Expected backend URL: [http://localhost:5001](http://localhost:5001)

---

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
pip install -r requirements.txt
python3 create_db.py        # Ensure tables exist
python3 run_migration.py    # CRITICAL: Sync location data and latest schema
```

**Note**: If we've updated the AI model, make sure you have the latest `best.pt` file in the `backend/` folder.

Then run backend and frontend again.
