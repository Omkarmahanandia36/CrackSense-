@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo    CrackSense AI - 1-Click Update and Release Publisher
echo ==========================================================
echo.
echo This will:
echo  1. Automatically bump the version (e.g. 1.2.1 -^> 1.2.2)
echo  2. Compile the production web assets
echo  3. Build the fresh Android APK (and Windows Installer)
echo  4. Upload the APK to Supabase Cloud
echo  5. Notify every app user that an update is ready!
echo.
set /p NOTES="Enter release notes for this update (or press Enter for default): "

if "%NOTES%"=="" (
    python scripts\publish_update.py
) else (
    python scripts\publish_update.py --notes "%NOTES%"
)

echo.
echo ==========================================================
echo Finished! Press any key to exit.
pause >nul
