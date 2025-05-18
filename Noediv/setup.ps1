#!/usr/bin/env pwsh
# Noediv Setup Script

# Check Python installation
$pythonVersion = (python --version) 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "Error: Python not found. Please install Python 3.8 or higher" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Python detected: $pythonVersion" -ForegroundColor Green

# Check Node.js installation
$nodeVersion = (node --version) 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "Error: Node.js not found. Please install Node.js 18 or higher" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js detected: $nodeVersion" -ForegroundColor Green

# Check FFmpeg installation
$ffmpegVersion = (ffmpeg -version) 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "Error: FFmpeg not found. Please install FFmpeg and ensure it's in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] FFmpeg detected" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Creating sample file..." -ForegroundColor Yellow
    Set-Content -Path ".env" -Value @"
WEBDAV_SERVER=http://example.com:5005
WEBDAV_USERNAME=username
WEBDAV_PASSWORD=password
MEDIA_ROOT=/media
"@
    Write-Host "Sample .env file created. Please edit it with your server information" -ForegroundColor Yellow
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt
if ($LastExitCode -ne 0) {
    Write-Host "Error: Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location -Path "frontend"
npm install
if ($LastExitCode -ne 0) {
    Write-Host "Error: Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location -Path ".."

Write-Host "==========================================" -ForegroundColor Green
Write-Host "All dependencies installed. Noediv is ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Please run the following commands in separate terminal windows:" -ForegroundColor Yellow
Write-Host "Terminal 1 (Backend): ./start_backend.ps1" -ForegroundColor Yellow
Write-Host "Terminal 2 (Frontend): ./start_frontend.ps1" -ForegroundColor Yellow
Write-Host "Then visit: http://localhost:5173" -ForegroundColor Yellow

$startBoth = Read-Host "Do you want to start both services automatically? (Y/N)"
if ($startBoth -eq "Y" -or $startBoth -eq "y") {
    Write-Host "Starting frontend in a new window..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -File .\start_frontend.ps1" 
    
    Write-Host "Starting backend..." -ForegroundColor Cyan
    & .\start_backend.ps1
} else {
    Write-Host "Please follow the instructions above to start the services manually. Enjoy!" -ForegroundColor Green
} 