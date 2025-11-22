@echo off
TITLE Alpha-Vision Launcher
CLS

ECHO ========================================================
ECHO   ALPHA-VISION APP LAUNCHER
ECHO ========================================================
ECHO.

:: 1. Check for Node.js
ECHO [*] Checking for Node.js...
WHERE npm >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    ECHO [!] CRITICAL ERROR: Node.js is not installed or not found.
    ECHO.
    ECHO Please download and install Node.js from:
    ECHO https://nodejs.org/
    ECHO.
    ECHO After installing, restart this script.
    PAUSE
    EXIT /B
)
ECHO [OK] Node.js found.
ECHO.

:: 2. Install Dependencies (if needed)
IF NOT EXIST "node_modules" (
    ECHO [*] Installing dependencies (this happens only once)...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        ECHO [!] Error installing dependencies.
        PAUSE
        EXIT /B
    )
    ECHO [OK] Dependencies installed.
    ECHO.
)

:: 3. Start the App
ECHO [*] Starting Alpha-Vision Server...
ECHO.
ECHO    Open your browser at: http://localhost:5173
ECHO.
call npm run dev

PAUSE
