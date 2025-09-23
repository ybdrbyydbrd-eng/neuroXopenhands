# Testing Guide - Models Pagination and Integration

This document provides step-by-step instructions to test the implemented features in the NeuroXopenhands project.

## Prerequisites

1. **Docker Desktop** installed and running
2. **Node.js** (v16 or higher) installed
3. **Git** installed

## Test Environment Setup

### 1. Start neuroXhaggingface Backend Server

```bash
# Navigate to neuroXhaggingface server directory
cd neuroXhaggingface/neuro-vision-forge-main/server

# Install dependencies
npm install

# Start the server (runs on port 5174)
npm start
```

### 2. Start neuroXhaggingface Frontend

```bash
# Navigate to neuroXhaggingface frontend directory
cd neuroXhaggingface/neuro-vision-forge-main

# Install dependencies
npm install

# Start the development server (runs on port 5173)
npm run dev
```

### 3. Start NeuroChat Backend

```bash
# Navigate to NeuroChat backend directory
cd neurochat/neurochat/backend/enhanced-ai-pipeline

# Install dependencies
npm install

# Start the backend server (runs on port 12000)
npm start
```

### 4. Start NeuroChat Frontend

```bash
# Navigate to NeuroChat frontend directory
cd neurochat/neurochat/frontend

# Start a simple HTTP server (runs on port 3000)
# Option 1: Using Node.js http-server
npx http-server -p 3000

# Option 2: Using Python (if available)
python -m http.server 3000

# Option 3: Simply open index.html in browser
```

### 5. Build and Run NeuroChat Agent (Docker)

#### Windows (PowerShell/CMD):
```cmd
# Build the Docker image
scripts\build-openhands-image.bat

# Run the container
scripts\run-openhands-image.bat
```

#### Linux/WSL:
```bash
# Make scripts executable
chmod +x scripts/build-openhands-image.sh scripts/run-openhands-image.sh

# Build the Docker image
./scripts/build-openhands-image.sh

# Run the container
./scripts/run-openhands-image.sh
```

## Test Cases

### Test 1: Hugging Face Models API Integration

**Objective**: Verify that real Hugging Face models are fetched and displayed with pagination.

**Steps**:
1. Open browser and navigate to `http://localhost:5173`
2. Go to the Models page
3. Verify that:
   - Real Hugging Face models are displayed (not fake data)
   - Each model shows: name, provider, description, tags, downloads, likes
   - Pagination controls (Back/Next buttons) are visible at the bottom
   - Page shows "Page 1" initially
   - Models are properly formatted and styled

**Expected Result**: 
- Models list shows real HF models with proper metadata
- Pagination works correctly
- No fallback mode warning should appear

**Error Handling Test**:
1. Stop the neuroXhaggingface backend server
2. Refresh the Models page
3. Verify that fallback models are shown with a warning message
4. Restart the backend and verify real models load again

### Test 2: Collection Management

**Objective**: Test adding models to collection and persistence.

**Steps**:
1. On the Models page, click the "+" button on any model card
2. Verify the button changes state (rotates and changes color)
3. Navigate to "My Collection" page
4. Verify the model appears in the collection
5. Refresh the page and verify the model is still in collection (persistence)
6. Click the trash icon to remove a model from collection
7. Verify the model is removed

**Expected Result**:
- Plus button works correctly and shows visual feedback
- Models are added to collection immediately
- Collection persists across page reloads
- Models can be removed from collection

### Test 3: Start Building Button Navigation

**Objective**: Verify that Start Building buttons open NeuroChat with correct parameters.

**Steps**:
1. On the Models page, click "Start with this model" on any model
2. Verify that:
   - A new tab opens
   - URL contains `http://localhost:3000/?mode=agent&preloadModels=<model-id>`
   - NeuroChat loads in the new tab
3. Go to a model detail page and click "Start with this model"
4. Verify the same behavior
5. Go to the Start Building page and test different options:
   - Chat Interface
   - Agent Builder  
   - API Integration

**Expected Result**:
- New tabs open correctly
- URLs contain proper query parameters
- NeuroChat loads with the specified mode and model IDs

### Test 4: Back to Home Button

**Objective**: Test navigation back to neuroXhaggingface from NeuroChat.

**Steps**:
1. Open NeuroChat at `http://localhost:3000`
2. Click the "Back to Home" button in the top bar
3. Verify that:
   - Page navigates to `http://localhost:5173/`
   - neuroXhaggingface loads correctly
   - No extra state is preserved

**Expected Result**:
- Smooth navigation back to neuroXhaggingface
- No JavaScript errors in console

### Test 5: Agent Mode and NeuroChat Branding

**Objective**: Verify that Agent Mode shows NeuroChat branding instead of OpenHands.

**Steps**:
1. In NeuroChat, switch to Agent Mode
2. Verify that:
   - Loading message shows "Connecting to NeuroChat Agent..."
   - Status shows "NeuroChat Agent loaded successfully"
   - No references to "OpenHands" appear in UI text
   - Docker command shows "neurochat-agent" container name

**Expected Result**:
- All UI text shows "NeuroChat Agent" instead of "OpenHands"
- Agent Mode loads correctly
- Toast notification shows correct branding

### Test 6: Docker Integration

**Objective**: Test Docker build and run scripts.

**Steps**:
1. Ensure Docker Desktop is running
2. Run the build script:
   - Windows: `scripts\build-openhands-image.bat`
   - Linux/WSL: `./scripts/build-openhands-image.sh`
3. Verify the image builds successfully
4. Run the container script:
   - Windows: `scripts\run-openhands-image.bat`
   - Linux/WSL: `./scripts/run-openhands-image.sh`
5. Verify the container starts and is accessible at `http://localhost:3000`

**Expected Result**:
- Docker image builds without errors
- Container starts successfully
- NeuroChat Agent is accessible via web browser

## Troubleshooting

### Common Issues

1. **Models not loading**: Check that the backend server is running on port 5174
2. **Start Building opens wrong URL**: Verify NeuroChat is running on port 3000
3. **Docker build fails**: Ensure Docker Desktop is running and has sufficient resources
4. **Back to Home doesn't work**: Check browser console for JavaScript errors
5. **Collection not persisting**: Verify backend server is running and accessible

### Debug Commands

```bash
# Check if servers are running
curl http://localhost:5174/health  # neuroXhaggingface backend
curl http://localhost:3000         # NeuroChat frontend

# Check Docker status
docker ps
docker images neurochat-agent:latest

# View server logs
# neuroXhaggingface backend: Check console output
# NeuroChat backend: Check console output
```

### Performance Verification

- Models page should load within 2-3 seconds
- Pagination should be smooth with no loading delays
- Collection operations should be immediate
- Navigation between components should be seamless

## Test Results Template

| Test Case | Status | Notes |
|-----------|--------|-------|
| HF Models API Integration | ⬜ Pass / ⬜ Fail | |
| Collection Management | ⬜ Pass / ⬜ Fail | |
| Start Building Navigation | ⬜ Pass / ⬜ Fail | |
| Back to Home Button | ⬜ Pass / ⬜ Fail | |
| Agent Mode Branding | ⬜ Pass / ⬜ Fail | |
| Docker Integration | ⬜ Pass / ⬜ Fail | |

## Browser Compatibility

Test in the following browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)  
- ✅ Edge (latest)
- ✅ Safari (latest)

## Mobile Testing

Test responsive design on:
- ✅ Mobile devices (320px width)
- ✅ Tablets (768px width)
- ✅ Desktop (1024px+ width)
