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

:: Extract access token using inline PowerShell
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content '%RESPFILE%' | ConvertFrom-Json).access_token"') do set ACCESS_TOKEN=%%a

echo Authentication successful!
echo.
echo Detecting hardware specifications...
echo (This may take a moment to scan Deep Specs...)
echo.

:: --- HARDWARE DETECTION ---

:: Basic Identity
for /f "tokens=2 delims==" %%a in ('wmic bios get serialnumber /value 2^>nul ^| find "="') do set SERIAL=%%a
for /f "tokens=2 delims==" %%a in ('wmic computersystem get manufacturer /value 2^>nul ^| find "="') do set BRAND=%%a
for /f "tokens=2 delims==" %%a in ('wmic computersystem get model /value 2^>nul ^| find "="') do set MODEL=%%a

:: CPU
for /f "tokens=2 delims==" %%a in ('wmic cpu get name /value 2^>nul ^| find "="') do set CPU=%%a
for /f "tokens=2 delims==" %%a in ('wmic cpu get numberofcores /value 2^>nul ^| find "="') do set CPU_CORES=%%a
for /f "tokens=2 delims==" %%a in ('wmic cpu get numberoflogicalprocessors /value 2^>nul ^| find "="') do set CPU_THREADS=%%a

:: RAM Size & RAM Type
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)"') do set RAM_GB=%%a

:: RAM Type Detection (requires PowerShell logic mapping codes to names)
:: 20=DDR, 21=DDR2, 24=DDR3, 26=DDR4, 30=LPDDR3, 34=DDR5, 35=LPDDR5
set PS_RAM_TYPE_CMD="$m=(Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1).SMBIOSMemoryType; switch($m){20{'DDR'} 21{'DDR2'} 24{'DDR3'} 26{'DDR4'} 30{'LPDDR3'} 34{'DDR5'} 35{'LPDDR5'} default{'Unknown'}}"
for /f "tokens=*" %%a in ('powershell -Command %PS_RAM_TYPE_CMD%') do set RAM_TYPE=%%a

:: Storage Size, Type & Model
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_DiskDrive | Select-Object -First 1).Size / 1GB)"') do set DISK_GB=%%a
for /f "tokens=2 delims==" %%a in ('wmic diskdrive get model /value 2^>nul ^| find "="') do set DISK_MODEL=%%a
echo %DISK_MODEL% | findstr /I "SSD NVMe Solid" >nul
if not errorlevel 1 (set DISK_TYPE=SSD) else (set DISK_TYPE=HDD)

:: OS
for /f "tokens=2 delims==" %%a in ('wmic os get caption /value 2^>nul ^| find "="') do set OS_NAME=%%a
for /f "tokens=2 delims==" %%a in ('wmic os get version /value 2^>nul ^| find "="') do set OS_VERSION=%%a

:: GPU Name & VRAM (Pure PowerShell for reliable VRAM)
for /f "tokens=2 delims==" %%a in ('wmic path win32_videocontroller get name /value 2^>nul ^| find "="') do set GPU=%%a
set PS_VRAM_CMD="[math]::Round((Get-CimInstance Win32_VideoController | Select-Object -First 1).AdapterRAM / 1MB)"
for /f "tokens=*" %%a in ('powershell -Command %PS_VRAM_CMD%') do set GPU_RAM=%%a

:: Display Resolution & Size (Diagonal)
for /f "tokens=2 delims==" %%a in ('wmic path win32_videocontroller get currenthorizontalresolution /value 2^>nul ^| find "="') do set RES_H=%%a
for /f "tokens=2 delims==" %%a in ('wmic path win32_videocontroller get currentverticalresolution /value 2^>nul ^| find "="') do set RES_V=%%a
set RESOLUTION=%RES_H%x%RES_V%

:: Try to get Screen Size (Diagonal in inches) via PowerShell/WMI
set PS_SCREEN_CMD="$wmi=Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue; if($wmi){$diag=[math]::Sqrt([math]::Pow($wmi.MaxHorizontalImageSize,2)+[math]::Pow($wmi.MaxVerticalImageSize,2))/2.54; [math]::Round($diag,1)}else{'Unknown'}"
for /f "tokens=*" %%a in ('powershell -Command %PS_SCREEN_CMD%') do set SCREEN_SIZE=%%a
if "%SCREEN_SIZE%"=="Unknown" set SCREEN_SIZE=Ext Monitor/Unknown

:: Network
for /f "tokens=2 delims==" %%a in ('wmic nic where "netenabled=true" get macaddress /value 2^>nul ^| find "="') do set MAC_ADDR=%%a

:: Battery
wmic path win32_battery get status >nul 2>&1
if errorlevel 1 (
    set HAS_BATTERY=false
    set BATTERY_STATUS=No Battery
) else (
    set HAS_BATTERY=true
    for /f "tokens=2 delims==" %%a in ('wmic path win32_battery get estimatedchargeremaining /value 2^>nul ^| find "="') do set BATTERY_PCT=%%a
    set BATTERY_STATUS=!BATTERY_PCT!%% remaining
)

set USER_NAME=%USERNAME%
set COMPUTER_NAME=%COMPUTERNAME%

echo.
echo ========================================
echo    DETECTED SPECIFICATIONS
echo ========================================
echo.
echo SYSTEM:
echo   Model:        %BRAND% %MODEL%
echo   Serial:       %SERIAL%
echo.
echo CPU:
echo   Name:         %CPU%
echo   Threads:      %CPU_THREADS%
echo.
echo MEMORY:
echo   RAM:          %RAM_GB% GB
echo   Type:         %RAM_TYPE%
echo.
echo STORAGE:
echo   Drive:        %DISK_GB% GB %DISK_TYPE%
echo.
echo GRAPHICS:
echo   GPU:          %GPU%
echo   VRAM:         %GPU_RAM% MB
echo   Resolution:   %RESOLUTION%
echo   Screen Size:  %SCREEN_SIZE% inch
echo.
echo OS:             %OS_NAME% %OS_VERSION%
echo ========================================
echo.

:: Build JSON
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
echo     "ram_gb": %RAM_GB%,
echo     "ram_type": "%RAM_TYPE%",
echo     "storage_gb": %DISK_GB%,
echo     "storage_type": "%DISK_TYPE%",
echo     "storage_model": "%DISK_MODEL%",
echo     "graphics_card": "%GPU%",
echo     "graphics_vram_mb": %GPU_RAM%,
echo     "screen_resolution": "%RESOLUTION%",
echo     "screen_size": "%SCREEN_SIZE%",
echo     "os_name": "%OS_NAME%",
echo     "os_version": "%OS_VERSION%",
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
