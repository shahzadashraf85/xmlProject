@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   LapTek Device Auto-Registration
echo ========================================
echo.

:: Get credentials
set /p EMAIL="Email: "
set /p PASSWORD="Password: "

echo.
echo Authenticating...

:: Create temp files
set AUTHFILE=%TEMP%\laptek_auth.json
set RESPFILE=%TEMP%\laptek_resp.txt

:: Build auth JSON
echo {"email":"%EMAIL%","password":"%PASSWORD%"} > %AUTHFILE%

:: Authenticate with Supabase
curl -s -X POST "https://xqsatwytjzvlhdmckfsb.supabase.co/auth/v1/token?grant_type=password" ^
  -H "apikey: sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J" ^
  -H "Content-Type: application/json" ^
  -d @%AUTHFILE% > %RESPFILE%

:: Check if we got an access token
findstr /C:"access_token" %RESPFILE% >nul
if errorlevel 1 (
    echo.
    echo ========================================
    echo   AUTHENTICATION FAILED
    echo ========================================
    echo Check your email and password.
    type %RESPFILE%
    pause
    exit /b 1
)

:: Extract access token using PowerShell (just for JSON parsing)
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content '%RESPFILE%' | ConvertFrom-Json).access_token"') do set ACCESS_TOKEN=%%a

echo Authentication successful!
echo.
echo Detecting hardware specifications...

:: Get system info using WMIC
for /f "tokens=2 delims==" %%a in ('wmic bios get serialnumber /value 2^>nul ^| find "="') do set SERIAL=%%a
for /f "tokens=2 delims==" %%a in ('wmic computersystem get manufacturer /value 2^>nul ^| find "="') do set BRAND=%%a
for /f "tokens=2 delims==" %%a in ('wmic computersystem get model /value 2^>nul ^| find "="') do set MODEL=%%a
for /f "tokens=2 delims==" %%a in ('wmic cpu get name /value 2^>nul ^| find "="') do set CPU=%%a
for /f "tokens=2 delims==" %%a in ('wmic os get caption /value 2^>nul ^| find "="') do set OS=%%a

:: Get RAM in GB
for /f "tokens=2 delims==" %%a in ('wmic computersystem get totalphysicalmemory /value 2^>nul ^| find "="') do set /a RAM_BYTES=%%a
set /a RAM_GB=%RAM_BYTES:~0,-9%

:: Get Disk size
for /f "tokens=2 delims==" %%a in ('wmic diskdrive get size /value 2^>nul ^| find "="') do set DISK_BYTES=%%a
set /a DISK_GB=%DISK_BYTES:~0,-9%

echo.
echo Detected Information:
echo   Brand:   %BRAND%
echo   Model:   %MODEL%
echo   Serial:  %SERIAL%
echo   CPU:     %CPU%
echo   RAM:     %RAM_GB% GB
echo   Storage: %DISK_GB% GB
echo   OS:      %OS%
echo.

:: Build registration JSON
set REGFILE=%TEMP%\laptek_reg.json
(
echo {
echo   "brand": "%BRAND%",
echo   "model": "%MODEL%",
echo   "serial_number": "%SERIAL%",
echo   "device_type": "LAPTOP",
echo   "grade": "B",
echo   "specs": {
echo     "processor": "%CPU%",
echo     "ram": "%RAM_GB% GB",
echo     "storage": "%DISK_GB% GB",
echo     "os": "%OS%"
echo   },
echo   "status": "pending_triage",
echo   "location": "Receiving"
echo }
) > %REGFILE%

echo Uploading to LapTek Inventory System...

:: Register device
curl -s -X POST "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device" ^
  -H "apikey: sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J" ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d @%REGFILE% > %RESPFILE%

:: Check result
findstr /C:"error" %RESPFILE% >nul
if not errorlevel 1 (
    echo.
    echo ========================================
    echo   REGISTRATION FAILED
    echo ========================================
    type %RESPFILE%
) else (
    echo.
    echo ========================================
    echo   REGISTRATION SUCCESSFUL!
    echo ========================================
    echo.
    echo Device has been added to inventory.
    echo Serial Number: %SERIAL%
    echo.
    echo Opening web dashboard...
    start "" "https://xmlproject.vercel.app/inventory?search=%SERIAL%&access_token=%ACCESS_TOKEN%"
)

:: Cleanup
del %AUTHFILE% 2>nul
del %REGFILE% 2>nul
del %RESPFILE% 2>nul

echo.
pause
