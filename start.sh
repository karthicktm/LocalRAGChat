#!/bin/bash

# LocalChat RAG Application Startup Script for Linux/macOS

set -e

echo "========================================"
echo "LocalChat RAG Application Startup"
echo "========================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.9+ from your package manager:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "  CentOS/RHEL: sudo yum install python3 python3-pip"
    echo "  macOS: brew install python3"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org or your package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL: sudo yum install nodejs npm"
    echo "  macOS: brew install node"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/localchat"

echo "Checking project structure..."
if [ ! -d "$BACKEND_DIR" ]; then
    echo "ERROR: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

echo
echo "Installing Python dependencies..."
cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

echo
echo "Installing Node.js dependencies..."
cd "$FRONTEND_DIR"
npm install

echo
echo "========================================"
echo "Starting LocalChat Services"
echo "========================================"
echo

# Function to cleanup background processes
cleanup() {
    echo
    echo "Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "Services stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend server..."
cd "$BACKEND_DIR"
source venv/bin/activate
python -m uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "Backend started successfully!"
else
    echo "WARNING: Backend may not be running properly"
fi

echo
echo "Starting frontend server..."
cd "$FRONTEND_DIR"
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 10

echo
echo "========================================"
echo "Services Started Successfully!"
echo "========================================"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo
echo "Press Ctrl+C to stop services"
echo

# Try to open browser (if command available)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null || true
elif command -v open &> /dev/null; then
    open http://localhost:3000 2>/dev/null || true
fi

echo "Startup complete! Both services are running."
echo "Keep this window open to maintain services."
echo

# Wait for background processes
wait