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
echo (This may take a moment...)
echo.

:: Get system info using WMIC
for /f "tokens=2 delims==" %%a in ('wmic bios get serialnumber /value 2^>nul ^| find "="') do set SERIAL=%%a
for /f "tokens=2 delims==" %%a in ('wmic computersystem get manufacturer /value 2^>nul ^| find "="') do set BRAND=%%a
for /f "tokens=2 delims==" %%a in ('wmic computersystem get model /value 2^>nul ^| find "="') do set MODEL=%%a

:: CPU info
for /f "tokens=2 delims==" %%a in ('wmic cpu get name /value 2^>nul ^| find "="') do set CPU=%%a
for /f "tokens=2 delims==" %%a in ('wmic cpu get numberofcores /value 2^>nul ^| find "="') do set CPU_CORES=%%a
for /f "tokens=2 delims==" %%a in ('wmic cpu get numberoflogicalprocessors /value 2^>nul ^| find "="') do set CPU_THREADS=%%a
for /f "tokens=2 delims==" %%a in ('wmic cpu get maxclockspeed /value 2^>nul ^| find "="') do set CPU_SPEED=%%a

:: RAM - use PowerShell for 64-bit math
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)"') do set RAM_GB=%%a

:: Storage - use PowerShell for 64-bit math
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_DiskDrive | Select-Object -First 1).Size / 1GB)"') do set DISK_GB=%%a
for /f "tokens=2 delims==" %%a in ('wmic diskdrive get model /value 2^>nul ^| find "="') do set DISK_MODEL=%%a

:: Determine storage type
echo %DISK_MODEL% | findstr /I "SSD NVMe Solid" >nul
if not errorlevel 1 (set DISK_TYPE=SSD) else (set DISK_TYPE=HDD)

:: OS info
for /f "tokens=2 delims==" %%a in ('wmic os get caption /value 2^>nul ^| find "="') do set OS_NAME=%%a
for /f "tokens=2 delims==" %%a in ('wmic os get version /value 2^>nul ^| find "="') do set OS_VERSION=%%a
for /f "tokens=2 delims==" %%a in ('wmic os get buildnumber /value 2^>nul ^| find "="') do set OS_BUILD=%%a
for /f "tokens=2 delims==" %%a in ('wmic os get osarchitecture /value 2^>nul ^| find "="') do set OS_ARCH=%%a

:: GPU info
for /f "tokens=2 delims==" %%a in ('wmic path win32_videocontroller get name /value 2^>nul ^| find "="') do set GPU=%%a
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_VideoController | Select-Object -First 1).AdapterRAM / 1MB)"') do set GPU_RAM=%%a

:: Screen resolution
for /f "tokens=2 delims==" %%a in ('wmic path win32_videocontroller get currenthorizontalresolution /value 2^>nul ^| find "="') do set RES_H=%%a
for /f "tokens=2 delims==" %%a in ('wmic path win32_videocontroller get currentverticalresolution /value 2^>nul ^| find "="') do set RES_V=%%a
set RESOLUTION=%RES_H%x%RES_V%

:: Network - MAC Address
for /f "tokens=2 delims==" %%a in ('wmic nic where "netenabled=true" get macaddress /value 2^>nul ^| find "="') do set MAC_ADDR=%%a

:: Battery check
wmic path win32_battery get status >nul 2>&1
if errorlevel 1 (
    set HAS_BATTERY=false
    set BATTERY_STATUS=No Battery
) else (
    set HAS_BATTERY=true
    for /f "tokens=2 delims==" %%a in ('wmic path win32_battery get estimatedchargeremaining /value 2^>nul ^| find "="') do set BATTERY_PCT=%%a
    set BATTERY_STATUS=!BATTERY_PCT!%% remaining
)

:: Computer name and username
set COMPUTER_NAME=%COMPUTERNAME%
set USER_NAME=%USERNAME%

echo.
echo ========================================
echo    DETECTED SPECIFICATIONS
echo ========================================
echo.
echo SYSTEM INFO:
echo   Brand:        %BRAND%
echo   Model:        %MODEL%
echo   Serial:       %SERIAL%
echo.
echo PROCESSOR:
echo   CPU:          %CPU%
echo   Cores:        %CPU_CORES% cores / %CPU_THREADS% threads
echo   Speed:        %CPU_SPEED% MHz
echo.
echo MEMORY:
echo   RAM:          %RAM_GB% GB
echo.
echo STORAGE:
echo   Size:         %DISK_GB% GB %DISK_TYPE%
echo   Model:        %DISK_MODEL%
echo.
echo GRAPHICS:
echo   GPU:          %GPU%
echo   VRAM:         %GPU_RAM% MB
echo   Resolution:   %RESOLUTION%
echo.
echo OPERATING SYSTEM:
echo   OS:           %OS_NAME%
echo   Version:      %OS_VERSION% (Build %OS_BUILD%)
echo   Architecture: %OS_ARCH%
echo.
echo NETWORK:
echo   MAC Address:  %MAC_ADDR%
echo.
echo BATTERY:
echo   Status:       %BATTERY_STATUS%
echo.
echo ========================================
echo.

:: Build registration JSON with all specs
set REGFILE=%TEMP%\laptek_reg.json
(
echo {
echo   "brand": "%BRAND%",
echo   "model": "%MODEL%",
echo   "serial_number": "%SERIAL%",
echo   "device_type": "LAPTOP",
echo   "grade": "B",
echo   "specs": {
echo     "manufacturer": "%BRAND%",
echo     "model_number": "%MODEL%",
echo     "processor": "%CPU%",
echo     "processor_cores": %CPU_CORES%,
echo     "processor_threads": %CPU_THREADS%,
echo     "processor_speed_mhz": %CPU_SPEED%,
echo     "ram_gb": %RAM_GB%,
echo     "storage_gb": %DISK_GB%,
echo     "storage_type": "%DISK_TYPE%",
echo     "storage_model": "%DISK_MODEL%",
echo     "graphics_card": "%GPU%",
echo     "graphics_vram_mb": %GPU_RAM%,
echo     "screen_resolution": "%RESOLUTION%",
echo     "os_name": "%OS_NAME%",
echo     "os_version": "%OS_VERSION%",
echo     "os_build": "%OS_BUILD%",
echo     "os_architecture": "%OS_ARCH%",
echo     "mac_address": "%MAC_ADDR%",
echo     "has_battery": %HAS_BATTERY%,
echo     "battery_status": "%BATTERY_STATUS%",
echo     "scanned_by": "%USER_NAME%",
echo     "computer_name": "%COMPUTER_NAME%"
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
