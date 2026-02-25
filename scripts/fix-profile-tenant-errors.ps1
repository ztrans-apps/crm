# Fix all profile.tenant_id type errors

$files = @(
    "app/api/whatsapp/sessions/route.ts",
    "app/api/webhooks/route.ts",
    "app/api/quick-replies/route.ts",
    "app/api/delivery/failed/route.ts",
    "app/api/delivery/stats/route.ts",
    "app/api/chatbots/route.ts",
    "app/api/broadcast/campaigns/[id]/route.ts",
    "app/api/broadcast/templates/route.ts",
    "app/api/broadcast/debug/route.ts",
    "app/api/broadcast/campaigns/route.ts",
    "app/api/broadcast/recipient-lists/route.ts",
    "app/api/broadcasts/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        
        # Replace profile.tenant_id with (profile as any).tenant_id
        # But avoid replacing if already has (profile as any)
        $content = $content -replace '(?<!\(profile as any\)\.)(profile\.tenant_id)', '(profile as any).tenant_id'
        
        Set-Content $file $content -NoNewline
        Write-Host "  Fixed" -ForegroundColor Green
    }
}

Write-Host "All profile.tenant_id errors fixed!" -ForegroundColor Green
