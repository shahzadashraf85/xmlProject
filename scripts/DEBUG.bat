@echo off
REM ========================================
REM  LAPTEK DEBUG SCRIPT
REM  Double-Click This File to Run!
REM ========================================

echo.
echo ========================================
echo    STARTING DEBUG MODE...
echo ========================================
echo.

REM Run PowerShell with bypass policy and keep window open (-NoExit)
powershell.exe -ExecutionPolicy Bypass -NoExit -File "%~dp0debug-register.ps1"

pause
