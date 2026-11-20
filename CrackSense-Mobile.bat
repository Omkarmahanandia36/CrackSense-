@echo off
title CrackSense AI - Mobile App Manager (Capacitor)
echo ===================================================
echo           CrackSense AI - Mobile App
echo ===================================================
echo.

cd /d "%~dp0"

echo [*] Checking Python AI Backend service (0.0.0.0:8000)...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [+] AI Engine is already running.
) else (
    echo [*] Starting FastAPI AI Engine on 0.0.0.0:8000 for LAN/mobile access...
    start "CrackSense AI Engine" /min python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
    timeout /t 3 /nobreak >nul
)

cd /d "%~dp0\desktop\frontend"

echo.
echo Choose an option:
echo  [1] Sync web app to Android and open in Android Studio
echo  [2] Run directly on connected Android device/emulator
echo  [3] Build updated Android web assets
echo.
set /p opt="Enter choice (1, 2, or 3): "

if "%opt%"=="1" (
    echo [*] Syncing web assets and opening Android Studio...
    npm run mobile:open
) else if "%opt%"=="2" (
    echo [*] Building and launching on Android device/emulator...
    npm run mobile:run
) else (
    echo [*] Rebuilding and syncing assets...
    npm run mobile:sync
)

pause
