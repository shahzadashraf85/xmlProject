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
powershell.exe -ExecutionPolicy Bypass -NoExit -File "%~dp0windows-register.ps1"

pause
