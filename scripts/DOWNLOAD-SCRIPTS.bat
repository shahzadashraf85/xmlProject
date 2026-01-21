@echo off
echo ========================================
echo   LapTek Script Downloader
echo ========================================
echo.
echo Downloading latest scripts...
echo.

cd /d "%USERPROFILE%\Desktop"

powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/shahzadashraf85/xmlProject/main/scripts/windows-register.ps1' -OutFile 'windows-register.ps1'"
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/shahzadashraf85/xmlProject/main/scripts/REGISTER-DEVICE.bat' -OutFile 'REGISTER-DEVICE.bat'"

echo.
echo ========================================
echo   Download Complete!
echo ========================================
echo.
echo Files saved to your Desktop:
echo   - windows-register.ps1
echo   - REGISTER-DEVICE.bat
echo.
echo You can now run REGISTER-DEVICE.bat
echo.
pause
