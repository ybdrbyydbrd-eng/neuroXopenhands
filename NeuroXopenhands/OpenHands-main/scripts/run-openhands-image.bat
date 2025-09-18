@echo off
REM Run script for NeuroChat Agent (formerly OpenHands) Docker container
REM Usage: scripts\run-openhands-image.bat

echo 🚀 Starting NeuroChat Agent Docker container...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if image exists
docker images neurochat-agent:latest --format "table {{.Repository}}:{{.Tag}}" | findstr "neurochat-agent:latest" >nul
if errorlevel 1 (
    echo ❌ Error: neurochat-agent:latest image not found.
    echo Please run scripts\build-openhands-image.bat first.
    exit /b 1
)

REM Stop and remove existing container if it exists
docker ps -a --format "table {{.Names}}" | findstr "neurochat-agent" >nul
if not errorlevel 1 (
    echo 🛑 Stopping existing neurochat-agent container...
    docker stop neurochat-agent >nul 2>&1
    docker rm neurochat-agent >nul 2>&1
)

REM Create .openhands directory if it doesn't exist
if not exist "%USERPROFILE%\.openhands" mkdir "%USERPROFILE%\.openhands"

echo 🐳 Starting NeuroChat Agent container...
docker run -it --rm ^
    --name neurochat-agent ^
    --pull=always ^
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.54-nikolaik ^
    -e LOG_ALL_EVENTS=true ^
    -v /var/run/docker.sock:/var/run/docker.sock ^
    -v "%USERPROFILE%\.openhands:/.openhands" ^
    -p 3000:3000 ^
    --add-host host.docker.internal:host-gateway ^
    neurochat-agent:latest

if errorlevel 1 (
    echo ❌ Failed to start NeuroChat Agent container
    exit /b 1
) else (
    echo ✅ NeuroChat Agent container started successfully!
    echo 🌐 Access the application at: http://localhost:3000
)
