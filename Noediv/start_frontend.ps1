# Ensure working in the correct directory
Set-Location -Path "$PSScriptRoot\frontend"

# Install dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install

# Start frontend development server
Write-Host "Starting frontend service..." -ForegroundColor Cyan
npm run dev 