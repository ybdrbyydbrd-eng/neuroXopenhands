#!/bin/bash

# Build script for NeuroChat Agent (formerly OpenHands) Docker image
# Usage: ./scripts/build-openhands-image.sh

set -e

echo "🚀 Building NeuroChat Agent Docker image..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Navigate to openhands-main directory
cd "$(dirname "$0")/.."

# Build the Docker image
echo "📦 Building Docker image: neurochat-agent:latest"
docker build -t neurochat-agent:latest .

if [ $? -eq 0 ]; then
    echo "✅ Successfully built neurochat-agent:latest"
    echo "🐳 Image details:"
    docker images neurochat-agent:latest
else
    echo "❌ Failed to build Docker image"
    exit 1
fi
