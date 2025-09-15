# NeuroChat Platform Launcher for PowerShell
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   NeuroChat Platform Launcher" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "[✓] Node.js is installed: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Backend setup
Write-Host "[1/4] Checking Backend dependencies..." -ForegroundColor Yellow
Set-Location "neurochat\backend\enhanced-ai-pipeline"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Backend dependencies..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "Backend dependencies already installed" -ForegroundColor Green
}

# Start Backend
Write-Host ""
Write-Host "[2/4] Starting Backend server..." -ForegroundColor Yellow
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 5

# Frontend setup
Write-Host ""
Write-Host "[3/4] Checking Frontend dependencies..." -ForegroundColor Yellow
Set-Location "..\..\frontend"

# Start Frontend
Write-Host ""
Write-Host "[4/4] Starting Frontend server..." -ForegroundColor Yellow
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "   NeuroChat is now running!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:12000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:8080"

Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop services
Write-Host ""
Write-Host "Stopping services..." -ForegroundColor Red
Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host "Services stopped." -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")