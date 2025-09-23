@echo off
REM Build script for NeuroChat Agent (formerly OpenHands) Docker image
REM Usage: scripts\build-openhands-image.bat

echo 🚀 Building NeuroChat Agent Docker image...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Navigate to openhands-main directory
cd /d "%~dp0.."

REM Build the Docker image
echo 📦 Building Docker image: neurochat-agent:latest
docker build -t neurochat-agent:latest .

if errorlevel 1 (
    echo ❌ Failed to build Docker image
    exit /b 1
) else (
    echo ✅ Successfully built neurochat-agent:latest
    echo 🐳 Image details:
    docker images neurochat-agent:latest
)
