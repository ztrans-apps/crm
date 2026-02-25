# Fix all remaining Supabase insert/update type errors

$files = Get-ChildItem -Path "app/api" -Filter "*.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Fix .insert( calls that don't already have (supabase as any)
    if ($content -match '(?<!as any\)\s*\n\s*)\.from\([^)]+\)\s*\.insert\(') {
        $content = $content -replace '(await\s+)(supabase)(\s+\.from\([^)]+\)\s+\.insert\()', '$1($2 as any)$3'
        $modified = $true
    }
    
    # Fix .update( calls that don't already have (supabase as any)
    if ($content -match '(?<!as any\)\s*\n\s*)\.from\([^)]+\)\s*\.update\(') {
        $content = $content -replace '(await\s+)(supabase)(\s+\.from\([^)]+\)\s+\.update\()', '$1($2 as any)$3'
        $modified = $true
    }
    
    if ($modified) {
        Write-Host "Fixed $($file.FullName)" -ForegroundColor Green
        Set-Content $file.FullName $content -NoNewline
    }
}

Write-Host "All Supabase insert/update errors fixed!" -ForegroundColor Green
