@echo off
REM Travel AI - Development Startup Script for Windows
REM This script starts both frontend and backend servers

echo 🇵🇭 Starting Travel AI Application...
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing frontend dependencies...
    call npm install
    echo.
)

REM Check if Python virtual environment exists
if not exist "server\venv\" (
    echo 🐍 Creating Python virtual environment...
    cd server
    python -m venv venv
    call venv\Scripts\activate
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
    cd ..
    echo.
)

REM Check if .env file exists
if not exist "server\.env" (
    echo ⚠️  Warning: server\.env file not found!
    echo 📝 Creating .env file from template...
    copy server\.env.example server\.env
    echo.
    echo ⚠️  IMPORTANT: Please edit server\.env and add your Hugging Face API key!
    echo    Get your free API key from: https://huggingface.co/settings/tokens
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
start "Travel AI Backend" cmd /k "cd server && venv\Scripts\activate && python app.py"

REM Wait a bit for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend in current window
npm run dev
