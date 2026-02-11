@echo off
REM Restart Services Script for Windows
REM This script will restart all development services

echo.
echo ======================================
echo   Restarting All Services
echo ======================================
echo.

REM 1. Stop any running Next.js dev server
echo [1/3] Stopping Next.js development server...
taskkill /F /IM node.exe /T 2>nul
if %errorlevel% equ 0 (
    echo [OK] Next.js dev server stopped
) else (
    echo [INFO] No Next.js dev server was running
)
echo.

REM 2. Clear Next.js cache
echo [2/3] Clearing Next.js cache...
if exist .next (
    rmdir /s /q .next
    echo [OK] Next.js cache cleared
) else (
    echo [INFO] No cache to clear
)
echo.

REM 3. Start Next.js dev server
echo [3/3] Starting Next.js development server...
echo.
echo Server will start on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm run dev
