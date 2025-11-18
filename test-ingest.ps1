# Quick test script to ingest incidents
$headers = @{
    "Authorization" = "Bearer towradar_cron_2024_secure_key_x9k2p7m5q8n3"
}

Write-Host "Testing incident ingestion..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/ingest" -Method Post -Headers $headers
    
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Fetched: $($response.fetched)" -ForegroundColor Yellow
    Write-Host "Inserted: $($response.inserted)" -ForegroundColor Yellow
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "Errors: $($response.errors.Count)" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host "  - $_" }
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
}
