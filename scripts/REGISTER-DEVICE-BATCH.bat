@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo   LapTek Device Auto-Registration
echo ========================================
echo.

echo Detecting hardware specifications...
echo (Using PowerShell for fast scanning...)
echo.

:: Create temp files
set RESPFILE=%TEMP%\laptek_resp.txt
set SPECS_SCRIPT=%TEMP%\laptek_specs.ps1
set SPECS_OUT=%TEMP%\laptek_specs.txt

:: --- GENERATE POWERSHELL SCRIPT LINE BY LINE ---
:: Using explicit redirects to avoid syntax errors with parentheses blocks

echo $ErrorActionPreference = 'SilentlyContinue' > "%SPECS_SCRIPT%"
echo $bios = Get-CimInstance Win32_BIOS >> "%SPECS_SCRIPT%"
echo $cs = Get-CimInstance Win32_ComputerSystem >> "%SPECS_SCRIPT%"
echo $cpu = Get-CimInstance Win32_Processor >> "%SPECS_SCRIPT%"
echo $disk = Get-CimInstance Win32_DiskDrive ^| Select-Object -First 1 >> "%SPECS_SCRIPT%"
echo $os = Get-CimInstance Win32_OperatingSystem >> "%SPECS_SCRIPT%"
echo $gpu = Get-CimInstance Win32_VideoController ^| Select-Object -First 1 >> "%SPECS_SCRIPT%"
echo $net = Get-CimInstance Win32_NetworkAdapterConfiguration ^| Where-Object {$_.IPEnabled -eq $true} ^| Select-Object -First 1 >> "%SPECS_SCRIPT%"
echo $mem = Get-CimInstance Win32_PhysicalMemory ^| Select-Object -First 1 >> "%SPECS_SCRIPT%"
echo. >> "%SPECS_SCRIPT%"
echo "SERIAL=" + $bios.SerialNumber >> "%SPECS_SCRIPT%"
echo "BRAND=" + $cs.Manufacturer >> "%SPECS_SCRIPT%"
echo "MODEL=" + $cs.Model >> "%SPECS_SCRIPT%"
echo "CPU=" + $cpu.Name >> "%SPECS_SCRIPT%"
echo "CPU_CORES=" + $cpu.NumberOfCores >> "%SPECS_SCRIPT%"
echo "CPU_THREADS=" + $cpu.NumberOfLogicalProcessors >> "%SPECS_SCRIPT%"
echo "CPU_SPEED=" + $cpu.MaxClockSpeed >> "%SPECS_SCRIPT%"
echo "RAM_GB=" + [math]::Round($cs.TotalPhysicalMemory / 1GB) >> "%SPECS_SCRIPT%"
echo "DISK_GB=" + [math]::Round($disk.Size / 1GB) >> "%SPECS_SCRIPT%"
echo "DISK_MODEL=" + $disk.Model >> "%SPECS_SCRIPT%"
echo "OS_NAME=" + $os.Caption >> "%SPECS_SCRIPT%"
echo "OS_VERSION=" + $os.Version >> "%SPECS_SCRIPT%"
echo "OS_BUILD=" + $os.BuildNumber >> "%SPECS_SCRIPT%"
echo "OS_ARCH=" + $os.OSArchitecture >> "%SPECS_SCRIPT%"
echo "GPU=" + $gpu.Name >> "%SPECS_SCRIPT%"
echo "GPU_RAM=" + [math]::Round($gpu.AdapterRAM / 1MB) >> "%SPECS_SCRIPT%"
echo "RESOLUTION=" + $gpu.CurrentHorizontalResolution + "x" + $gpu.CurrentVerticalResolution >> "%SPECS_SCRIPT%"
echo "MAC_ADDR=" + $net.MACAddress >> "%SPECS_SCRIPT%"
echo. >> "%SPECS_SCRIPT%"
echo # Touch Screen Detection >> "%SPECS_SCRIPT%"
echo $touch = Get-CimInstance Win32_PnPEntity ^| Where-Object { $_.Name -match 'Touch' -or $_.Name -match 'Touch Screen' } >> "%SPECS_SCRIPT%"
echo if ($touch) { "IS_TOUCH=true" } else { "IS_TOUCH=false" } >> "%SPECS_SCRIPT%"
echo. >> "%SPECS_SCRIPT%"
echo switch($mem.SMBIOSMemoryType){20{"RAM_TYPE=DDR"} 21{"RAM_TYPE=DDR2"} 24{"RAM_TYPE=DDR3"} 26{"RAM_TYPE=DDR4"} 30{"RAM_TYPE=LPDDR3"} 34{"RAM_TYPE=DDR5"} 35{"RAM_TYPE=LPDDR5"} default{"RAM_TYPE=Unknown"}} >> "%SPECS_SCRIPT%"
echo. >> "%SPECS_SCRIPT%"
echo if (Get-CimInstance Win32_Battery) { >> "%SPECS_SCRIPT%"
echo     "HAS_BATTERY=true" >> "%SPECS_SCRIPT%"
echo     "BATTERY_STATUS=Present" >> "%SPECS_SCRIPT%"
echo     $scriptDir = '%~dp0' >> "%SPECS_SCRIPT%"
echo     $bivLocal = Join-Path $scriptDir "BatteryInfoView.exe" >> "%SPECS_SCRIPT%"
echo     $bivTemp = "$env:TEMP\BatteryInfoView.exe" >> "%SPECS_SCRIPT%"
echo     if (Test-Path $bivLocal) { $biv = $bivLocal } elseif (Test-Path $bivTemp) { $biv = $bivTemp } else { >> "%SPECS_SCRIPT%"
echo         try { Invoke-WebRequest -Uri "https://www.nirsoft.net/utils/batterytinfoview-x64.zip" -OutFile "$env:TEMP\biv.zip" -UseBasicParsing; Expand-Archive "$env:TEMP\biv.zip" -DestinationPath "$env:TEMP" -Force; $biv = $bivTemp } catch { $biv = $null } >> "%SPECS_SCRIPT%"
echo     } >> "%SPECS_SCRIPT%"
echo     $csv = "$env:TEMP\battery.csv" >> "%SPECS_SCRIPT%"
echo     if ($biv -and (Test-Path $biv)) { >> "%SPECS_SCRIPT%"
echo         Start-Process $biv -ArgumentList "/scomma `"$csv`"" -Wait -NoNewWindow >> "%SPECS_SCRIPT%"
echo         if (Test-Path $csv) { >> "%SPECS_SCRIPT%"
echo             $data = Import-Csv $csv >> "%SPECS_SCRIPT%"
echo             $design = [int]$data.'Design Capacity' >> "%SPECS_SCRIPT%"
echo             $full = [int]$data.'Full Charged Capacity' >> "%SPECS_SCRIPT%"
echo             $cycles = $data.'Cycle Count' >> "%SPECS_SCRIPT%"
echo             if ($design -gt 0 -and $full -gt 0) { $pct = [math]::Round(($full / $design) * 100); "BATTERY_HEALTH=$pct%%" } else { "BATTERY_HEALTH=Unknown" } >> "%SPECS_SCRIPT%"
echo             "BATTERY_CYCLES=$cycles" >> "%SPECS_SCRIPT%"
echo         } else { "BATTERY_HEALTH=Unknown"; "BATTERY_CYCLES=0" } >> "%SPECS_SCRIPT%"
echo     } else { "BATTERY_HEALTH=Unknown"; "BATTERY_CYCLES=0" } >> "%SPECS_SCRIPT%"
echo } else { "HAS_BATTERY=false"; "BATTERY_STATUS=No Battery"; "BATTERY_HEALTH=N/A"; "BATTERY_CYCLES=N/A" } >> "%SPECS_SCRIPT%"
echo. >> "%SPECS_SCRIPT%"
echo $mon = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue >> "%SPECS_SCRIPT%"
echo if ($mon) { $diag = [math]::Sqrt([math]::Pow($mon.MaxHorizontalImageSize,2) + [math]::Pow($mon.MaxVerticalImageSize,2)) / 2.54; "SCREEN_SIZE=" + [math]::Round($diag, 1) } else { "SCREEN_SIZE=Ext Monitor/Unknown" } >> "%SPECS_SCRIPT%"

:: Verify script was created
if not exist "%SPECS_SCRIPT%" (
    echo ERROR: Could not create PowerShell script at %SPECS_SCRIPT%
    pause
    exit /b 1
)

:: Run the scanner once
powershell -ExecutionPolicy Bypass -File "%SPECS_SCRIPT%" > "%SPECS_OUT%"

:: Verify output was created
if not exist "%SPECS_OUT%" (
    echo ERROR: PowerShell script did not produce output at %SPECS_OUT%
    pause
    exit /b 1
)

:: Read the output variables
for /f "tokens=1,2 delims==" %%A in (%SPECS_OUT%) do (
    set %%A=%%B
)

:: Disk Type Logic (Batch side)
echo %DISK_MODEL% | findstr /I "SSD NVMe Solid" >nul
if not errorlevel 1 (set DISK_TYPE=SSD) else (set DISK_TYPE=HDD)

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
echo DISPLAY:
echo   Size:         %SCREEN_SIZE%
if "%IS_TOUCH%"=="true" (echo   Touch:        YES) else (echo   Touch:        NO)
echo.
echo OS:             %OS_NAME%
echo.
echo BATTERY:
echo   Status:       %BATTERY_STATUS%
echo   Health:       %BATTERY_HEALTH%
echo   Cycles:       %BATTERY_CYCLES%
echo ========================================
echo ========================================
echo.

:: ===== CHECK FOR DUPLICATE SERIAL NUMBER =====
echo Checking for existing registration...
echo.

set DUPFILE=%TEMP%\\laptek_dup.txt
curl -s --insecure "https://xqsatwytjzvlhdmckfsb.supabase.co/rest/v1/inventory_items?serial_number=eq.%SERIAL%&select=id,brand,model,created_at" ^
  -H "apikey: sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J" ^
  -H "Authorization: Bearer sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J" > "%DUPFILE%"

:: Check if response contains data (not empty array [])
findstr /C:"\"id\"" "%DUPFILE%" >nul
if not errorlevel 1 (
    echo.
    echo ========================================
    echo   DEVICE ALREADY REGISTERED
    echo ========================================
    echo.
    echo This device is already in the inventory system.
    echo Serial Number: %SERIAL%
    echo.
    echo No duplicate entry will be created.
    echo.
    echo Shutting down PC now...
    shutdown /s /t 0 /c "Laptop already registered - Auto shutdown"
    exit /b 0
)

echo Serial number is unique. Proceeding with registration...
echo.
del "%DUPFILE%" 2>nul
:: ===== END DUPLICATE CHECK =====

echo.
echo ========================================
echo    MANUAL INPUT
echo ========================================
echo.

:ask_grade
set GRADE=
set /p GRADE_IN="Enter Grade (A/B/C) [Default: B]: "
if "%GRADE_IN%"=="" set GRADE_IN=B
if /I "%GRADE_IN%"=="A" set GRADE=A
if /I "%GRADE_IN%"=="B" set GRADE=B
if /I "%GRADE_IN%"=="C" set GRADE=C
if "%GRADE%"=="" (
    echo Invalid grade. Please enter A, B, or C.
    goto ask_grade
)

set COMMENT=
if /I not "%GRADE%"=="A" (
    set /p COMMENT="Enter Reason/Comment (e.g. Scratched lid): "
)

:ask_status
echo Select Status:
echo   1. Pending Triage (Default)
echo   2. In Repair
echo   3. Ready to Ship
echo   4. Scrapped
set STATUS_STR=
set /p STATUS_IN="Enter Status Option (1-4): "
if "%STATUS_IN%"=="" set STATUS_IN=1
if "%STATUS_IN%"=="1" set STATUS_STR=pending_triage
if "%STATUS_IN%"=="2" set STATUS_STR=in_repair
if "%STATUS_IN%"=="3" set STATUS_STR=ready_to_ship
if "%STATUS_IN%"=="4" set STATUS_STR=scrapped
if "%STATUS_STR%"=="" (
    echo Invalid selection. Please enter 1-4.
    goto ask_status
)

set /p LOC="Enter Location [Default: Receiving]: "
if "%LOC%"=="" set LOC=Receiving

:: Build JSON
set REGFILE=%TEMP%\laptek_reg.json
echo { > "%REGFILE%"
echo   "brand": "%BRAND%", >> "%REGFILE%"
echo   "model": "%MODEL%", >> "%REGFILE%"
echo   "serial_number": "%SERIAL%", >> "%REGFILE%"
echo   "device_type": "LAPTOP", >> "%REGFILE%"
echo   "grade": "%GRADE%", >> "%REGFILE%"
echo   "specs": { >> "%REGFILE%"
echo     "manufacturer": "%BRAND%", >> "%REGFILE%"
echo     "model_number": "%MODEL%", >> "%REGFILE%"
echo     "processor": "%CPU%", >> "%REGFILE%"
echo     "processor_cores": %CPU_CORES%, >> "%REGFILE%"
echo     "processor_threads": %CPU_THREADS%, >> "%REGFILE%"
echo     "processor_speed_mhz": %CPU_SPEED%, >> "%REGFILE%"
echo     "ram_gb": %RAM_GB%, >> "%REGFILE%"
echo     "ram_type": "%RAM_TYPE%", >> "%REGFILE%"
echo     "storage_gb": %DISK_GB%, >> "%REGFILE%"
echo     "storage_model": "%DISK_MODEL%", >> "%REGFILE%"
echo     "storage_type": "%DISK_TYPE%", >> "%REGFILE%"
echo     "graphics_card": "%GPU%", >> "%REGFILE%"
echo     "graphics_vram_mb": %GPU_RAM%, >> "%REGFILE%"
echo     "screen_resolution": "%RESOLUTION%", >> "%REGFILE%"
echo     "screen_size": "%SCREEN_SIZE%", >> "%REGFILE%"
echo     "is_touch_screen": %IS_TOUCH%, >> "%REGFILE%"
echo     "os_name": "%OS_NAME%", >> "%REGFILE%"
echo     "os_version": "%OS_VERSION%", >> "%REGFILE%"
echo     "os_build": "%OS_BUILD%", >> "%REGFILE%"
echo     "os_architecture": "%OS_ARCH%", >> "%REGFILE%"
echo     "mac_address": "%MAC_ADDR%", >> "%REGFILE%"
echo     "has_battery": %HAS_BATTERY%, >> "%REGFILE%"
echo     "battery_status": "%BATTERY_STATUS%", >> "%REGFILE%"
echo     "battery_health": "%BATTERY_HEALTH%", >> "%REGFILE%"
echo     "battery_cycles": "%BATTERY_CYCLES%", >> "%REGFILE%"
echo     "scanned_by": "%USER_NAME%", >> "%REGFILE%"
echo     "computer_name": "%COMPUTER_NAME%" >> "%REGFILE%"
echo   }, >> "%REGFILE%"
echo   "status": "%STATUS_STR%", >> "%REGFILE%"
echo   "location": "%LOC%", >> "%REGFILE%"
echo   "comments": "%COMMENT%" >> "%REGFILE%"
echo } >> "%REGFILE%"

echo Uploading to LapTek Inventory System...

:: Register device (Using Anon Key)
curl -s --insecure -X POST "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device" ^
  -H "apikey: sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J" ^
  -H "Content-Type: application/json" ^
  -d @"%REGFILE%" > "%RESPFILE%"

:: Check result
type "%RESPFILE%" | findstr /I /C:"error" /C:"message" /C:"code" >nul
if not errorlevel 1 (
    :: Found error keywords, but check if it's a success message with "message"
    type "%RESPFILE%" | findstr /C:"success" >nul
    if not errorlevel 1 (
        goto :success
    )
    echo.
    echo ========================================
    echo   REGISTRATION FAILED
    echo ========================================
    type "%RESPFILE%"
) else (
    :success
    echo.
    echo ========================================
    echo   REGISTRATION SUCCESSFUL!
    echo ========================================
    echo.
    echo Device has been added to inventory.
    echo Serial Number: %SERIAL%
    echo.
    echo Shutting down PC now...
    shutdown /s /t 0 /c "Laptop registration complete - Auto shutdown"
)

:: Cleanup
del "%AUTHFILE%" 2>nul
del "%REGFILE%" 2>nul
del "%RESPFILE%" 2>nul
del "%SPECS_SCRIPT%" 2>nul
del "%SPECS_OUT%" 2>nul

echo.
pause
