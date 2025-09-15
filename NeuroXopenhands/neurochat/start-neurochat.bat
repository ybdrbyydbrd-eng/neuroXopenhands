@echo off
echo ====================================
echo   NeuroChat Platform Launcher
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js is installed
echo.

REM Navigate to the script directory
cd /d "%~dp0"

REM Install Backend dependencies if needed
echo [1/4] Checking Backend dependencies...
cd neurochat\backend\enhanced-ai-pipeline
if not exist node_modules (
    echo Installing Backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

REM Start Backend
echo.
echo [2/4] Starting Backend server...
start "NeuroChat Backend" cmd /k "npm start"
timeout /t 5 /nobreak >nul

REM Navigate to Frontend
echo.
echo [3/4] Checking Frontend dependencies...
cd ..\..\frontend

REM Start Frontend
echo.
echo [4/4] Starting Frontend server...
start "NeuroChat Frontend" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

echo.
echo ====================================
echo   NeuroChat is now running!
echo ====================================
echo.
echo Backend:  http://localhost:12000
echo Frontend: http://localhost:8080
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:8080

echo.
echo Press any key to stop all services...
pause >nul

REM Kill the services
taskkill /FI "WindowTitle eq NeuroChat Backend*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq NeuroChat Frontend*" /T /F >nul 2>&1

echo.
echo Services stopped.
pause