#!/bin/bash

# Travel AI - Development Startup Script
# This script starts both frontend and backend servers

echo "🇵🇭 Starting Travel AI Application..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

# Check if Python virtual environment exists
if [ ! -d "server/venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    cd server
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
    cd ..
    echo ""
fi

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env file not found!"
    echo "📝 Creating .env file from template..."
    cp server/.env.example server/.env
    echo ""
    echo "⚠️  IMPORTANT: Please edit server/.env and add your Hugging Face API key!"
    echo "   Get your free API key from: https://huggingface.co/settings/tokens"
    echo ""
    read -p "Press Enter to continue after adding your API key..."
fi

echo "🚀 Starting servers..."
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
cd server
source venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend (this will be in foreground)
npm run dev &
FRONTEND_PID=$!

# Trap Ctrl+C and kill both processes
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for both processes
wait
