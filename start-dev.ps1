# Set Node.js v24 to PATH
$env:PATH = "C:\laragon\bin\nodejs\node-v24;$env:PATH"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Starting WhatsApp CRM Development" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "Node.js version: " -NoNewline
node --version
Write-Host ""

# Start WhatsApp Service in new window
Write-Host "Starting WhatsApp Service on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\whatsapp-service'; `$env:PATH = 'C:\laragon\bin\nodejs\node-v24;`$env:PATH'; npm run dev"

# Wait a bit
Start-Sleep -Seconds 2

# Start Next.js App in new window
Write-Host "Starting Next.js App on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; `$env:PATH = 'C:\laragon\bin\nodejs\node-v24;`$env:PATH'; npm run dev"

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Development servers are starting!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next.js App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "WhatsApp Service: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
