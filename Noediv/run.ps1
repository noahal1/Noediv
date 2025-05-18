#!/usr/bin/env pwsh
# Noediv 一键启动脚本

# 检查 Python 是否安装
$pythonVersion = (python --version) 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "错误: 未找到 Python，请安装 Python 3.8 或更高版本" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 已检测到 Python: $pythonVersion" -ForegroundColor Green

# 检查 Node.js 是否安装
$nodeVersion = (node --version) 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "错误: 未找到 Node.js，请安装 Node.js 18 或更高版本" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 已检测到 Node.js: $nodeVersion" -ForegroundColor Green

# 检查 FFmpeg 是否安装
$ffmpegVersion = (ffmpeg -version) 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "错误: 未找到 FFmpeg，请安装 FFmpeg 并确保它在 PATH 中" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 已检测到 FFmpeg" -ForegroundColor Green

# 检查 .env 文件是否存在
if (-not (Test-Path ".env")) {
    Write-Host "警告: 未找到 .env 文件，正在创建示例文件..." -ForegroundColor Yellow
    Set-Content -Path ".env" -Value @"
WEBDAV_SERVER=http://example.com:5005
WEBDAV_USERNAME=username
WEBDAV_PASSWORD=password
MEDIA_ROOT=/media
"@
    Write-Host "已创建示例 .env 文件，请编辑它以指定您的服务器信息" -ForegroundColor Yellow
}

# 安装后端依赖
Write-Host "正在安装后端依赖..." -ForegroundColor Cyan
pip install -r requirements.txt
if ($LastExitCode -ne 0) {
    Write-Host "错误: 安装后端依赖失败" -ForegroundColor Red
    exit 1
}

# 安装前端依赖
Write-Host "正在安装前端依赖..." -ForegroundColor Cyan
Set-Location -Path "frontend"
npm install
if ($LastExitCode -ne 0) {
    Write-Host "错误: 安装前端依赖失败" -ForegroundColor Red
    exit 1
}
Set-Location -Path ".."

Write-Host "===========================================" -ForegroundColor Green
Write-Host "所有依赖已安装，Noediv 准备就绪!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host "请在两个单独的终端窗口中运行以下命令:" -ForegroundColor Yellow
Write-Host "终端 1 (后端): ./start.ps1" -ForegroundColor Yellow
Write-Host "终端 2 (前端): ./start_frontend.ps1" -ForegroundColor Yellow
Write-Host "然后访问: http://localhost:5173" -ForegroundColor Yellow

$startBoth = Read-Host "您想要自动启动前后端服务吗? (Y/N)"
if ($startBoth -eq "Y" -or $startBoth -eq "y") {
    Write-Host "正在新窗口中启动前端..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -File .\start_frontend.ps1" 
    
    Write-Host "正在启动后端..." -ForegroundColor Cyan
    & .\start.ps1
} else {
    Write-Host "请按照上述说明手动启动服务。祝您使用愉快!" -ForegroundColor Green
} 