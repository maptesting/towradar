# TowRadar Background Incident Tracker
# Run this script to continuously track incidents in the background

param(
    [string]$Url = "http://localhost:3000",
    [string]$CronSecret = "towradar_cron_2024_secure_key_x9k2p7m5q8n3",
    [int]$IntervalMinutes = 15
)

$headers = @{
    "Authorization" = "Bearer $CronSecret"
}

$logFile = "towradar-background.log"

Write-Host "TowRadar Background Tracker Started" -ForegroundColor Green
Write-Host "URL: $Url" -ForegroundColor Cyan
Write-Host "Interval: $IntervalMinutes minutes" -ForegroundColor Cyan
Write-Host "Log file: $logFile" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $logFile -Value $logMessage
}

function Invoke-Ingest {
    try {
        Write-Log "Calling /api/ingest..."
        $response = Invoke-RestMethod -Uri "$Url/api/ingest" -Method Post -Headers $headers -TimeoutSec 30
        
        if ($response.ok) {
            Write-Log "✓ Ingest successful - Fetched: $($response.fetched), Inserted: $($response.inserted)" "SUCCESS"
            if ($response.errors -and $response.errors.Count -gt 0) {
                Write-Log "⚠ Errors: $($response.errors.Count)" "WARN"
            }
        } else {
            Write-Log "✗ Ingest failed: $($response.error)" "ERROR"
        }
    } catch {
        Write-Log "✗ Ingest error: $_" "ERROR"
    }
}

function Invoke-Notify {
    try {
        Write-Log "Calling /api/notify..."
        $response = Invoke-RestMethod -Uri "$Url/api/notify" -Method Post -Headers $headers -TimeoutSec 30
        
        if ($response.ok) {
            Write-Log "✓ Notify successful - Notified: $($response.notified)" "SUCCESS"
        } else {
            Write-Log "✗ Notify failed: $($response.error)" "ERROR"
        }
    } catch {
        Write-Log "✗ Notify error: $_" "ERROR"
    }
}

# Main loop
while ($true) {
    Write-Log "=== Starting cycle ===" "INFO"
    
    Invoke-Ingest
    Start-Sleep -Seconds 5
    Invoke-Notify
    
    Write-Log "=== Cycle complete. Waiting $IntervalMinutes minutes ===" "INFO"
    Write-Host ""
    
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
