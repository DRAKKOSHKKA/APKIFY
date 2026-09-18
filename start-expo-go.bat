@echo off
setlocal
cd /d "%~dp0"

echo Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo Node.js is not installed or is not available in PATH.
    echo Install Node.js 22.13.x or newer, then run this file again.
    pause
    exit /b 1
)

node --version
if not exist package.json (
    echo.
    echo package.json was not found. Run this file from the project folder.
    pause
    exit /b 1
)

if not exist node_modules\expo\package.json (
    echo.
    echo Dependencies are missing. Installing them with npm install...
    call npm install
    if errorlevel 1 (
        echo.
        echo Dependency installation failed.
        pause
        exit /b 1
    )
)

echo.
echo Starting Expo Go development server...
echo Scan the QR code with Expo Go on your phone.
echo.

if /i "%~1"=="tunnel" (
    call npx expo start --tunnel --go
) else (
    call npx expo start --go
)

if errorlevel 1 (
    echo.
    echo Expo stopped with an error.
    pause
)

endlocal
