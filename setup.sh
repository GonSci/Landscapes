#!/bin/bash

# Quick Setup Script for Travel AI
# This installs everything you need to get started

echo "╔════════════════════════════════════════════════════════╗"
echo "║     🇵🇭 Travel AI - Quick Setup for Hackathon 🇵🇭      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "🔍 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION installed"
else
    echo "❌ Node.js not found!"
    echo "   Please install from: https://nodejs.org/"
    exit 1
fi

# Check Python
echo "🔍 Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ $PYTHON_VERSION installed"
else
    echo "❌ Python not found!"
    echo "   Please install from: https://www.python.org/"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo ""

# Create Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd server
python3 -m venv venv
if [ $? -eq 0 ]; then
    echo "✅ Virtual environment created"
else
    echo "❌ Failed to create virtual environment"
    exit 1
fi

# Activate and install Python dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for .env file
if [ ! -f "server/.env" ]; then
    echo "📝 Creating .env file..."
    cp server/.env.example server/.env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: You need to add your Hugging Face API key!"
    echo ""
    echo "   1. Go to: https://huggingface.co/settings/tokens"
    echo "   2. Create a new token (Read permissions)"
    echo "   3. Edit server/.env file"
    echo "   4. Replace 'your_huggingface_api_key_here' with your key"
    echo ""
    echo "   To edit: nano server/.env (or use any text editor)"
    echo ""
else
    echo "✅ .env file already exists"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              ✨ Setup Complete! ✨                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your Hugging Face API key to server/.env"
echo "     Edit with: nano server/.env"
echo ""
echo "  2. Start the application:"
echo "     ./start.sh"
echo ""
echo "  3. Open your browser to:"
echo "     http://localhost:3000"
echo ""
echo "  4. Read the documentation:"
echo "     - GET_STARTED.md  (Start here!)"
echo "     - QUICKSTART.md"
echo "     - README.md"
echo ""
echo "🎉 Ready to build something amazing!"
echo "🇵🇭 Mabuhay!"
echo ""
