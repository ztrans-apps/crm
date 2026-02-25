@echo off
echo ==================================
echo Starting WhatsApp CRM Development
echo   (Meta Cloud API Architecture)
echo ==================================
echo.

REM Set Node.js v24 to PATH
set PATH=C:\laragon\bin\nodejs\node-v24;%PATH%

REM Check Node.js version
echo Node.js version:
node --version
echo.

REM Start Next.js App
echo Starting Next.js App on port 3000...
start "Next.js App" cmd /k "set PATH=C:\laragon\bin\nodejs\node-v24;%PATH% && npm run dev"

echo.
echo ==================================
echo Development server is starting!
echo   No external WhatsApp service needed
echo   Using Meta Cloud API directly
echo ==================================
echo.
echo Next.js App: http://localhost:3000
echo.
pause
