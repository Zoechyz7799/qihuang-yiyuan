@echo off
chcp 65001 >nul
title 气脉陪练 4.0 Demo - 启动器
cd /d "%~dp0"

echo.
echo  ================================================
echo    气脉陪练 · 刘看山 x 易筋经  Demo
echo    知乎创客松 · 陪伴赛道
echo  ================================================
echo.
echo  正在启动本地服务器，浏览器将自动打开...
echo  若没弹出，请手动访问 http://localhost:8848
echo.
echo  使用完毕后，直接关闭此窗口即可停止服务器。
echo.

REM 优先用系统自带 PowerShell 启动服务器（无需安装任何东西）
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"

echo.
echo  服务器已停止。
pause
