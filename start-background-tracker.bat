@echo off
echo Starting TowRadar Background Tracker...
echo.
echo This will run continuously and track incidents every 15 minutes.
echo Press Ctrl+C to stop.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0background-tracker.ps1"
