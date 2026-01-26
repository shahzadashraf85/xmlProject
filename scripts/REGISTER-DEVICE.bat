@echo off
REM ========================================
REM  LAPTEK DEVICE REGISTRATION
REM  Double-Click This File to Run!
REM ========================================

echo.
echo ========================================
echo    LAPTEK DEVICE REGISTRATION
echo ========================================
echo.
echo Starting PowerShell script...
echo.

REM Run PowerShell with bypass policy (no admin needed)
REM Removed -NoExit to allow auto-shutdown to work
powershell.exe -ExecutionPolicy Bypass -File "%~dp0windows-register.ps1"
