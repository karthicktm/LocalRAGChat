@echo off
echo ========================================
echo Stopping LocalChat Services
echo ========================================
echo.

REM Stop backend server
echo Stopping backend server...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| find "uvicorn"') do (
    taskkill /pid %%i /f >nul 2>&1
)

REM Stop frontend server
echo Stopping frontend server...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| find "react-scripts"') do (
    taskkill /pid %%i /f >nul 2>&1
)

echo.
echo Services stopped successfully!
echo.
pause