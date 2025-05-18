@echo off
chcp 65001 >nul
echo Starting Noediv...
powershell -ExecutionPolicy Bypass -File .\setup.ps1
pause 