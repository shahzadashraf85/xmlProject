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
curl -s --insecure -X POST "https://xqsatwytjzvlhdmckfsb.supabase.co/auth/v1/token?grant_type=password" ^
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
    echo Request Payload:
    type %AUTHFILE%
    echo.
    echo Server Response:
    type %RESPFILE%
    echo.
    echo Check your email and password.
    pause
    exit /b 1
)

:: Extract access & refresh tokens using inline PowerShell
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content '%RESPFILE%' | ConvertFrom-Json).access_token"') do set ACCESS_TOKEN=%%a
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content '%RESPFILE%' | ConvertFrom-Json).refresh_token"') do set REFRESH_TOKEN=%%a

echo Authentication successful!
echo.
echo Detecting hardware specifications...
echo (Switching to PowerShell scanning engine for better reliability...)
echo.

:: --- HARDWARE DETECTION (PowerShell Hybrid) ---

:: Get Serial
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_BIOS).SerialNumber"') do set SERIAL=%%a
if "%SERIAL%"=="" set SERIAL=Unknown

:: Get Brand
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_ComputerSystem).Manufacturer"') do set BRAND=%%a
if "%BRAND%"=="" set BRAND=Unknown

:: Get Model
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_ComputerSystem).Model"') do set MODEL=%%a
if "%MODEL%"=="" set MODEL=Unknown

:: Get CPU Name
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_Processor).Name"') do set CPU=%%a
if "%CPU%"=="" set CPU=Unknown

:: Get CPU Cores
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_Processor).NumberOfCores"') do set CPU_CORES=%%a
if "%CPU_CORES%"=="" set CPU_CORES=0

:: Get CPU Threads
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors"') do set CPU_THREADS=%%a
if "%CPU_THREADS%"=="" set CPU_THREADS=0

:: Get CPU Speed
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_Processor).MaxClockSpeed"') do set CPU_SPEED=%%a
if "%CPU_SPEED%"=="" set CPU_SPEED=0

:: RAM Size
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)"') do set RAM_GB=%%a
if "%RAM_GB%"=="" set RAM_GB=0

:: RAM Type Detection
set PS_RAM_TYPE_CMD="$m=(Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1).SMBIOSMemoryType; switch($m){20{'DDR'} 21{'DDR2'} 24{'DDR3'} 26{'DDR4'} 30{'LPDDR3'} 34{'DDR5'} 35{'LPDDR5'} default{'Unknown'}}"
for /f "tokens=*" %%a in ('powershell -Command %PS_RAM_TYPE_CMD%') do set RAM_TYPE=%%a

:: Storage Size
for /f "tokens=*" %%a in ('powershell -Command "[math]::Round((Get-CimInstance Win32_DiskDrive | Select-Object -First 1).Size / 1GB)"') do set DISK_GB=%%a
if "%DISK_GB%"=="" set DISK_GB=0

:: Storage Model
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_DiskDrive | Select-Object -First 1).Model"') do set DISK_MODEL=%%a
if "%DISK_MODEL%"=="" set DISK_MODEL=Unknown

:: Storage Type
echo %DISK_MODEL% | findstr /I "SSD NVMe Solid" >nul
if not errorlevel 1 (set DISK_TYPE=SSD) else (set DISK_TYPE=HDD)

:: OS Name
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_OperatingSystem).Caption"') do set OS_NAME=%%a
if "%OS_NAME%"=="" set OS_NAME=Unknown

:: OS Version
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_OperatingSystem).Version"') do set OS_VERSION=%%a
if "%OS_VERSION%"=="" set OS_VERSION=Unknown

:: OS Build
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_OperatingSystem).BuildNumber"') do set OS_BUILD=%%a
if "%OS_BUILD%"=="" set OS_BUILD=Unknown

:: OS Architecture
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_OperatingSystem).OSArchitecture"') do set OS_ARCH=%%a
if "%OS_ARCH%"=="" set OS_ARCH=Unknown

:: GPU Name
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name"') do set GPU=%%a
if "%GPU%"=="" set GPU=Unknown

:: GPU VRAM
set PS_VRAM_CMD="[math]::Round((Get-CimInstance Win32_VideoController | Select-Object -First 1).AdapterRAM / 1MB)"
for /f "tokens=*" %%a in ('powershell -Command %PS_VRAM_CMD%') do set GPU_RAM=%%a
if "%GPU_RAM%"=="" set GPU_RAM=0

:: Screen Resolution
set PS_RES_CMD="$v=Get-CimInstance Win32_VideoController | Select-Object -First 1; $v.CurrentHorizontalResolution + 'x' + $v.CurrentVerticalResolution"
for /f "tokens=*" %%a in ('powershell -Command %PS_RES_CMD%') do set RESOLUTION=%%a
if "%RESOLUTION%"=="x" set RESOLUTION=Unknown

:: Screen Size
set PS_SCREEN_CMD="$wmi=Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue; if($wmi){$diag=[math]::Sqrt([math]::Pow($wmi.MaxHorizontalImageSize,2)+[math]::Pow($wmi.MaxVerticalImageSize,2))/2.54; [math]::Round($diag,1)}else{'Unknown'}"
for /f "tokens=*" %%a in ('powershell -Command %PS_SCREEN_CMD%') do set SCREEN_SIZE=%%a
if "%SCREEN_SIZE%"=="Unknown" set SCREEN_SIZE=Ext Monitor/Unknown

:: MAC Address
for /f "tokens=*" %%a in ('powershell -Command "(Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object {$_.IPEnabled -eq $true} | Select-Object -First 1).MACAddress"') do set MAC_ADDR=%%a
if "%MAC_ADDR%"=="" set MAC_ADDR=Unknown

:: Battery
set PS_BAT_CMD="if((Get-CimInstance Win32_Battery)){'Yes'}else{'No'}"
for /f "tokens=*" %%a in ('powershell -Command %PS_BAT_CMD%') do set HAS_BATTERY_STR=%%a
if "%HAS_BATTERY_STR%"=="Yes" (
    set HAS_BATTERY=true
    set BATTERY_STATUS=Present
) else (
    set HAS_BATTERY=false
    set BATTERY_STATUS=No Battery
)

set USER_NAME=%USERNAME%
set COMPUTER_NAME=%COMPUTERNAME%

echo.
echo ========================================
echo    DETECTED SPECIFICATIONS
echo ========================================
echo.
echo SYSTEM:
echo   Brand:        %BRAND%
echo   Model:        %MODEL%
echo   Serial:       %SERIAL%
echo.
echo CPU:
echo   Name:         %CPU%
echo   Cores:        %CPU_CORES%
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
echo.
echo OS:             %OS_NAME%
echo ========================================
echo.

:: Build JSON with Fallbacks (Sanitize quotes in variable values if any)
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
curl -s --insecure -X POST "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device" ^
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
    start "" "https://xmlproject.vercel.app/inventory?search=%SERIAL%&access_token=%ACCESS_TOKEN%&refresh_token=%REFRESH_TOKEN%"
)

:: Cleanup
del %AUTHFILE% 2>nul
del %REGFILE% 2>nul
del %RESPFILE% 2>nul

echo.
pause
