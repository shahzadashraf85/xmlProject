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

:: --- FAST HARDWARE DETECTION (Single Pass) ---

set SPECS_SCRIPT=%TEMP%\laptek_specs.ps1
set SPECS_OUT=%TEMP%\laptek_specs.txt

:: Create the PowerShell scanner script
(
echo $ErrorActionPreference = 'SilentlyContinue'
echo $bios = Get-CimInstance Win32_BIOS
echo $cs = Get-CimInstance Win32_ComputerSystem
echo $cpu = Get-CimInstance Win32_Processor
echo $disk = Get-CimInstance Win32_DiskDrive ^| Select-Object -First 1
echo $os = Get-CimInstance Win32_OperatingSystem
echo $gpu = Get-CimInstance Win32_VideoController ^| Select-Object -First 1
echo $net = Get-CimInstance Win32_NetworkAdapterConfiguration ^| Where-Object {$_.IPEnabled -eq $true} ^| Select-Object -First 1
echo $mem = Get-CimInstance Win32_PhysicalMemory ^| Select-Object -First 1
echo.
echo "SERIAL=" + $bios.SerialNumber
echo "BRAND=" + $cs.Manufacturer
echo "MODEL=" + $cs.Model
echo "CPU=" + $cpu.Name
echo "CPU_CORES=" + $cpu.NumberOfCores
echo "CPU_THREADS=" + $cpu.NumberOfLogicalProcessors
echo "CPU_SPEED=" + $cpu.MaxClockSpeed
echo "RAM_GB=" + [math]::Round^($cs.TotalPhysicalMemory / 1GB^)
echo "DISK_GB=" + [math]::Round^($disk.Size / 1GB^)
echo "DISK_MODEL=" + $disk.Model
echo "OS_NAME=" + $os.Caption
echo "OS_VERSION=" + $os.Version
echo "OS_BUILD=" + $os.BuildNumber
echo "OS_ARCH=" + $os.OSArchitecture
echo "GPU=" + $gpu.Name
echo "GPU_RAM=" + [math]::Round^($gpu.AdapterRAM / 1MB^)
echo "RESOLUTION=" + $gpu.CurrentHorizontalResolution + "x" + $gpu.CurrentVerticalResolution
echo "MAC_ADDR=" + $net.MACAddress
echo.
echo # RAM Type Logic
echo switch^($mem.SMBIOSMemoryType^){20{"RAM_TYPE=DDR"} 21{"RAM_TYPE=DDR2"} 24{"RAM_TYPE=DDR3"} 26{"RAM_TYPE=DDR4"} 30{"RAM_TYPE=LPDDR3"} 34{"RAM_TYPE=DDR5"} 35{"RAM_TYPE=LPDDR5"} default{"RAM_TYPE=Unknown"}}
echo.
echo # Battery Logic
echo if ^(Get-CimInstance Win32_Battery^) { "HAS_BATTERY=true"; "BATTERY_STATUS=Present" } else { "HAS_BATTERY=false"; "BATTERY_STATUS=No Battery" }
echo.
echo # Screen Size Logic
echo $mon = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue
echo if ^($mon^) {
echo     $diag = [math]::Sqrt^([math]::Pow^($mon.MaxHorizontalImageSize,2^) + [math]::Pow^($mon.MaxVerticalImageSize,2^)^) / 2.54
echo     "SCREEN_SIZE=" + [math]::Round^($diag, 1^)
echo } else { "SCREEN_SIZE=Ext Monitor/Unknown" }
) > "%SPECS_SCRIPT%"

:: Run the scanner once
powershell -ExecutionPolicy Bypass -File "%SPECS_SCRIPT%" > "%SPECS_OUT%"

:: Read the output variables
for /f "tokens=1,2 delims==" %%A in (%SPECS_OUT%) do (
    set %%A=%%B
)

:: Disk Type Logic (Batch side)
echo %DISK_MODEL% | findstr /I "SSD NVMe Solid" >nul
if not errorlevel 1 (set DISK_TYPE=SSD) else (set DISK_TYPE=HDD)

:: Clean up temp files
del "%SPECS_SCRIPT%"
del "%SPECS_OUT%"

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
    start "" "https://xmlproject.vercel.app/login?redirect=/inventory?search=%SERIAL%&access_token=%ACCESS_TOKEN%&refresh_token=%REFRESH_TOKEN%"
)&refresh_token=%REFRESH_TOKEN%"
)

:: Cleanup
del %AUTHFILE% 2>nul
del %REGFILE% 2>nul
del %RESPFILE% 2>nul

echo.
pause
