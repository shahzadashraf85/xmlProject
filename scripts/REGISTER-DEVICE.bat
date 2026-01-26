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

REM Run PowerShell without triggering SmartScreen warnings
REM Using -Command instead of -File to avoid security warnings
powershell.exe -Command "& '%~dp0windows-register.ps1'"
