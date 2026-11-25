@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting Qi-Pulse interactive lesson server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
echo.
echo Server stopped. Press any key to close this window.
pause >nul
