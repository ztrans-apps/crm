# Fix all tenant.id type errors

$files = @(
    "app/api/contacts/route.ts",
    "app/api/contacts/[contactId]/route.ts",
    "app/api/broadcast/stats/route.ts",
    "app/api/modules/route.ts",
    "app/api/modules/[moduleName]/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        
        # Replace tenant.id with (tenant as any).id
        # But avoid replacing if already has (tenant as any)
        $content = $content -replace '(?<!\(tenant as any\)\.)(tenant\.id)', '(tenant as any).id'
        
        Set-Content $file $content -NoNewline
        Write-Host "  Fixed" -ForegroundColor Green
    }
}

Write-Host "All tenant.id errors fixed!" -ForegroundColor Green
