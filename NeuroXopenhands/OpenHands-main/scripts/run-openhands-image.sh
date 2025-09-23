#!/bin/bash

# Run script for NeuroChat Agent (formerly OpenHands) Docker container
# Usage: ./scripts/run-openhands-image.sh

set -e

echo "🚀 Starting NeuroChat Agent Docker container..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if image exists
if ! docker images neurochat-agent:latest --format "table {{.Repository}}:{{.Tag}}" | grep -q "neurochat-agent:latest"; then
    echo "❌ Error: neurochat-agent:latest image not found."
    echo "Please run ./scripts/build-openhands-image.sh first."
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a --format "table {{.Names}}" | grep -q "neurochat-agent"; then
    echo "🛑 Stopping existing neurochat-agent container..."
    docker stop neurochat-agent || true
    docker rm neurochat-agent || true
fi

# Create .openhands directory if it doesn't exist
mkdir -p ~/.openhands

echo "🐳 Starting NeuroChat Agent container..."
docker run -it --rm \
    --name neurochat-agent \
    --pull=always \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.54-nikolaik \
    -e LOG_ALL_EVENTS=true \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v ~/.openhands:/.openhands \
    -p 3000:3000 \
    --add-host host.docker.internal:host-gateway \
    neurochat-agent:latest

echo "✅ NeuroChat Agent container started successfully!"
echo "🌐 Access the application at: http://localhost:3000"
