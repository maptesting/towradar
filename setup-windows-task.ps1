# Creates a Windows scheduled task to run background tracker every 15 minutes
# Run this script ONCE to set it up, then it runs automatically forever

$taskName = "TowRadar-BackgroundTracker"
$scriptPath = "$PSScriptRoot\background-tracker.ps1"
$url = "http://localhost:3000"

# Create action to run every 15 minutes
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Url `"$url`" -IntervalMinutes 1"

# Create trigger - runs every 15 minutes
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration ([TimeSpan]::MaxValue)

# Create settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Register the task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "TowRadar incident tracking background service" -Force

Write-Host "✓ Task '$taskName' created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "The task will run every 15 minutes automatically in the background." -ForegroundColor Cyan
Write-Host "You can close all windows - it will keep running!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view/manage: Open Task Scheduler > Task Scheduler Library > $taskName" -ForegroundColor Yellow
Write-Host "To remove: Run Unregister-ScheduledTask -TaskName $taskName -Confirm:false" -ForegroundColor Yellow
