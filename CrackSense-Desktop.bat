@echo off
title CrackSense AI - Desktop Launcher
echo ===================================================
echo           CrackSense AI - Desktop App
echo ===================================================
echo.

cd /d "%~dp0"

echo [*] Checking Python AI Backend service (port 8000)...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [+] AI Engine is already running.
) else (
    echo [*] Starting FastAPI AI Engine on port 8000...
    start "CrackSense AI Engine" /min python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
    timeout /t 3 /nobreak >nul
)

echo [*] Launching CrackSense Desktop Window...
cd desktop
npm start

echo.
echo [*] CrackSense Desktop closed.
