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

REM Run PowerShell directly without triggering security warnings
REM No admin needed, no execution policy bypass
powershell.exe -Command "& '%~dp0windows-register.ps1'"
