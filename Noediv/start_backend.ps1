# Ensure working in the correct directory
Set-Location -Path $PSScriptRoot

# Install dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

# Start backend service
Write-Host "Starting backend service..." -ForegroundColor Cyan
uvicorn main:app --host 0.0.0.0 --port 8000 --reload