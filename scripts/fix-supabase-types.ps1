# Script to add type assertions to all supabase calls (PowerShell)

Get-ChildItem -Path "app" -Filter "*.tsx" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $newContent = $content -replace 'await supabase\.', 'await (supabase as any).'
    if ($content -ne $newContent) {
        Set-Content -Path $_.FullName -Value $newContent -NoNewline
        Write-Host "Fixed: $($_.FullName)"
    }
}

Write-Host "Done fixing all supabase type assertions"
