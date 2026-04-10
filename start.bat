@echo off
REM Travel AI - Development Startup Script for Windows
REM This script starts both frontend and backend servers

echo 🇵🇭 Starting Travel AI Application...
echo.

REM Check if frontend node_modules exists
if not exist "frontend\node_modules\" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

REM Check if Python virtual environment exists
if not exist "backend\venv\" (
    echo 🐍 Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
    cd ..
    echo.
)

REM Check if .env file exists
if not exist "backend\.env" (
    echo ⚠️  Warning: backend\.env file not found!
    echo 📝 Creating .env file from template...
    copy backend\.env.example backend\.env
    echo.
    echo ⚠️  IMPORTANT: Please review backend\.env and set any required values.
    echo.
    pause
)

echo 🚀 Starting servers...
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5001
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend in new window
start "Travel AI Backend" cmd /k "cd backend && venv\Scripts\activate && python app.py"

REM Wait a bit for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend in current window
cd frontend
npm run dev
