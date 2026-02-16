@echo off
echo ==================================
echo Starting WhatsApp CRM Development
echo ==================================
echo.

REM Set Node.js v24 to PATH
set PATH=C:\laragon\bin\nodejs\node-v24;%PATH%

REM Check Node.js version
echo Node.js version:
node --version
echo.

REM Start WhatsApp Service
echo Starting WhatsApp Service on port 3001...
start "WhatsApp Service" cmd /k "cd whatsapp-service && set PATH=C:\laragon\bin\nodejs\node-v24;%PATH% && npm run dev"

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Start Next.js App
echo Starting Next.js App on port 3000...
start "Next.js App" cmd /k "set PATH=C:\laragon\bin\nodejs\node-v24;%PATH% && npm run dev"

echo.
echo ==================================
echo Development servers are starting!
echo ==================================
echo.
echo Next.js App: http://localhost:3000
echo WhatsApp Service: http://localhost:3001
echo.
pause
