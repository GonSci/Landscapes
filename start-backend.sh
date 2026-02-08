#!/bin/bash

# Simple Backend Starter
# Run this to start just the Flask backend server

cd "$(dirname "$0")"
cd server

echo "🐍 Starting Flask Backend Server..."
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run setup.sh first to create it."
    exit 1
fi

# Activate venv and start server
source venv/bin/activate
python app.py
