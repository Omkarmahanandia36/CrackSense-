@echo off
title CrackSense AI - Mobile App Manager (Capacitor)
echo ===================================================
echo           CrackSense AI - Mobile App
echo ===================================================
echo.

cd /d "%~dp0\desktop\frontend"

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
