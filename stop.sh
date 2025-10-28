#!/bin/bash

echo "========================================"
echo "Stopping LocalChat Services"
echo "========================================"
echo

# Stop backend server (Python uvicorn processes)
echo "Stopping backend server..."
pkill -f "uvicorn" 2>/dev/null || true

# Stop frontend server (Node.js react-scripts processes)
echo "Stopping frontend server..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

echo
echo "Services stopped successfully!"
echo