# Stop all Node.js processes
Write-Host "Stopping all development servers..." -ForegroundColor Yellow

# Kill processes on port 3000 and 3001
$ports = @(3000, 3001)

foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port"
    if ($connections) {
        $connections | ForEach-Object {
            $line = $_.Trim()
            if ($line -match '\s+(\d+)$') {
                $pid = $matches[1]
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "Stopped process on port $port (PID: $pid)" -ForegroundColor Green
                } catch {
                    Write-Host "Could not stop process $pid" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "No process found on port $port" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "All development servers stopped!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
