@echo off
setlocal enabledelayedexpansion
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
    echo [*] Starting FastAPI AI Engine on port 8000 (with PyTorch + YOLO)...
    start "CrackSense AI Engine" /min python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
    echo [*] Waiting for AI models to initialize...
    for /l %%i in (1,1,25) do (
        powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [+] AI Engine is online and ready!
            goto start_app
        )
        <nul set /p=.
        timeout /t 1 /nobreak >nul
    )
    echo.
    echo [!] Notice: AI Engine is still loading weights in background. Proceeding to launch UI...
)

:start_app
echo.
echo [*] Launching CrackSense Desktop Window...
cd desktop
npm start

echo.
echo [*] CrackSense Desktop closed.
