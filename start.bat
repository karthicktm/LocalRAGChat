@echo off
echo ========================================
echo LocalChat RAG Application Startup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Get script directory
set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%localchat

echo Checking project structure...
if not exist "%BACKEND_DIR%" (
    echo ERROR: Backend directory not found at %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo ERROR: Frontend directory not found at %FRONTEND_DIR%
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies...
cd /d "%BACKEND_DIR%"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing backend dependencies...
pip install -r requirements.txt

echo.
echo Installing Node.js dependencies...
cd /d "%FRONTEND_DIR%"
call npm install

echo.
echo ========================================
echo Starting LocalChat Services
echo ========================================
echo.

REM Start backend in background
echo Starting backend server...
cd /d "%BACKEND_DIR%"
start "Backend Server" cmd /c "venv\Scripts\activate.bat && python -m uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Check if backend is running
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Backend may not be running properly
) else (
    echo Backend started successfully!
)

echo.
echo Starting frontend server...
cd /d "%FRONTEND_DIR%"
start "Frontend Server" cmd /c "npm start"

echo.
echo ========================================
echo Services Starting Up
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop services, or run stop.bat
echo.

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 10 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo Startup complete! Both services are running.
echo You can close this window - services will continue running in background.
echo.
pause