# 确保在正确的目录
Set-Location -Path $PSScriptRoot

# 安装依赖
Write-Host "安装后端依赖..." -ForegroundColor Cyan
pip install -r requirements.txt

# 启动后端服务
Write-Host "启动后端服务..." -ForegroundColor Cyan
uvicorn main:app --host 0.0.0.0 --port 8000 --reload