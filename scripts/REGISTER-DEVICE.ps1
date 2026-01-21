# ========================================
#  LAPTEK DEVICE REGISTRATION - FULL SPECS
# ========================================

$ErrorActionPreference = "Stop"

try {
    $API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2F0d3l0anp2bGhkbWNrZnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDU2NTAsImV4cCI6MjA1MTA4MTY1MH0.sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"
    $API_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device"

    Write-Host ""
    Write-Host "========================================"
    Write-Host "   LAPTEK FULL DEVICE SCANNER"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Scanning all hardware specs..."
    Write-Host ""

    # ========== SYSTEM INFO ==========
    $computerInfo = Get-ComputerInfo
    $bios = Get-CimInstance Win32_BIOS
    $system = Get-CimInstance Win32_ComputerSystem
    $baseboard = Get-CimInstance Win32_BaseBoard
    
    # ========== PROCESSOR ==========
    $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
    $cpuName = $cpu.Name
    $cpuCores = $cpu.NumberOfCores
    $cpuThreads = $cpu.NumberOfLogicalProcessors
    $cpuSpeed = $cpu.MaxClockSpeed
    $cpuArch = if ($cpu.AddressWidth -eq 64) { "64-bit" } else { "32-bit" }
    
    # ========== MEMORY (RAM) ==========
    $ram = Get-CimInstance Win32_PhysicalMemory
    $totalRamGB = [math]::Round(($ram | Measure-Object -Property Capacity -Sum).Sum / 1GB, 0)
    $ramSlots = ($ram | Measure-Object).Count
    $ramSpeed = ($ram | Select-Object -First 1).Speed
    $ramType = switch (($ram | Select-Object -First 1).SMBIOSMemoryType) {
        20 { "DDR" }
        21 { "DDR2" }
        22 { "DDR2 FB-DIMM" }
        24 { "DDR3" }
        26 { "DDR4" }
        34 { "DDR5" }
        default { "Unknown" }
    }
    
    # ========== STORAGE ==========
    $disks = Get-CimInstance Win32_DiskDrive
    $primaryDisk = $disks | Select-Object -First 1
    $diskSizeGB = [math]::Round($primaryDisk.Size / 1GB, 0)
    $diskModel = $primaryDisk.Model
    $diskType = if ($diskModel -match "SSD|NVMe|Solid") { "SSD" } elseif ($diskModel -match "HDD") { "HDD" } else { "Unknown" }
    
    # Get all storage info
    $allStorage = @()
    foreach ($disk in $disks) {
        $allStorage += @{
            model = $disk.Model
            size_gb = [math]::Round($disk.Size / 1GB, 0)
            type = if ($disk.Model -match "SSD|NVMe|Solid") { "SSD" } else { "HDD" }
            interface = $disk.InterfaceType
        }
    }
    
    # ========== GRAPHICS CARD ==========
    $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
    $gpuName = $gpu.Name
    $gpuRamMB = [math]::Round($gpu.AdapterRAM / 1MB, 0)
    $gpuDriver = $gpu.DriverVersion
    $screenResolution = "$($gpu.CurrentHorizontalResolution)x$($gpu.CurrentVerticalResolution)"
    
    # Get all GPUs
    $allGPUs = @()
    foreach ($g in (Get-CimInstance Win32_VideoController)) {
        $allGPUs += @{
            name = $g.Name
            ram_mb = [math]::Round($g.AdapterRAM / 1MB, 0)
            driver = $g.DriverVersion
        }
    }
    
    # ========== DISPLAY / MONITOR ==========
    $monitors = Get-CimInstance Win32_DesktopMonitor
    $monitorCount = ($monitors | Measure-Object).Count
    
    # Try to get screen size (diagonal) - this is tricky on Windows
    $screenSize = "Unknown"
    try {
        $wmi = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue
        if ($wmi) {
            $widthCm = $wmi.MaxHorizontalImageSize
            $heightCm = $wmi.MaxVerticalImageSize
            if ($widthCm -and $heightCm) {
                $diagonalCm = [math]::Sqrt([math]::Pow($widthCm, 2) + [math]::Pow($heightCm, 2))
                $diagonalInches = [math]::Round($diagonalCm / 2.54, 1)
                $screenSize = "$diagonalInches inch"
            }
        }
    } catch {}
    
    # ========== OPERATING SYSTEM ==========
    $os = Get-CimInstance Win32_OperatingSystem
    $osName = $os.Caption
    $osVersion = $os.Version
    $osBuild = $os.BuildNumber
    $osArch = $os.OSArchitecture
    $installDate = $os.InstallDate
    
    # ========== NETWORK ==========
    $network = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
    $macAddress = $network.MACAddress
    $ipAddress = ($network.IPAddress | Select-Object -First 1)
    
    # WiFi info
    $wifi = Get-CimInstance Win32_NetworkAdapter | Where-Object { $_.Name -match "Wi-Fi|Wireless|802.11" } | Select-Object -First 1
    $wifiAdapter = if ($wifi) { $wifi.Name } else { "None" }
    
    # ========== BATTERY (Laptops) ==========
    $battery = Get-CimInstance Win32_Battery
    $hasBattery = $battery -ne $null
    $batteryStatus = if ($hasBattery) { 
        switch ($battery.BatteryStatus) {
            1 { "Discharging" }
            2 { "AC Power" }
            3 { "Fully Charged" }
            4 { "Low" }
            5 { "Critical" }
            default { "Unknown" }
        }
    } else { "No Battery" }
    $batteryHealth = if ($hasBattery -and $battery.EstimatedChargeRemaining) { "$($battery.EstimatedChargeRemaining)%" } else { "N/A" }
    
    # ========== DEVICE TYPE ==========
    $chassisType = (Get-CimInstance Win32_SystemEnclosure).ChassisTypes[0]
    $deviceType = switch ($chassisType) {
        1 { "Other" }
        2 { "Unknown" }
        3 { "Desktop" }
        4 { "Low Profile Desktop" }
        5 { "Pizza Box" }
        6 { "Mini Tower" }
        7 { "Tower" }
        8 { "Portable" }
        9 { "Laptop" }
        10 { "Notebook" }
        11 { "Hand Held" }
        12 { "Docking Station" }
        13 { "All-in-One" }
        14 { "Sub Notebook" }
        30 { "Tablet" }
        31 { "Convertible" }
        32 { "Detachable" }
        default { "Computer" }
    }
    
    # ========== ADDITIONAL INFO ==========
    $biosVersion = $bios.SMBIOSBIOSVersion
    $biosDate = $bios.ReleaseDate
    $motherboard = "$($baseboard.Manufacturer) $($baseboard.Product)"
    
    # ========== EXTRACT KEY VALUES ==========
    $brand = $computerInfo.CsManufacturer
    $model = $computerInfo.CsModel
    $serial = $bios.SerialNumber
    $partNumber = $system.SystemSKUNumber
    
    # ========== DISPLAY ALL FOUND INFO ==========
    Write-Host "========================================"
    Write-Host "   DETECTED SPECIFICATIONS"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "SYSTEM INFO:"
    Write-Host "  Brand:              $brand"
    Write-Host "  Model:              $model"
    Write-Host "  Serial Number:      $serial"
    Write-Host "  Part Number:        $partNumber"
    Write-Host "  Device Type:        $deviceType"
    Write-Host "  Motherboard:        $motherboard"
    Write-Host ""
    Write-Host "PROCESSOR:"
    Write-Host "  CPU:                $cpuName"
    Write-Host "  Cores/Threads:      $cpuCores cores / $cpuThreads threads"
    Write-Host "  Max Speed:          $cpuSpeed MHz"
    Write-Host "  Architecture:       $cpuArch"
    Write-Host ""
    Write-Host "MEMORY:"
    Write-Host "  RAM:                $totalRamGB GB $ramType @ $ramSpeed MHz"
    Write-Host "  RAM Slots Used:     $ramSlots"
    Write-Host ""
    Write-Host "STORAGE:"
    Write-Host "  Primary Drive:      $diskSizeGB GB $diskType"
    Write-Host "  Drive Model:        $diskModel"
    Write-Host ""
    Write-Host "GRAPHICS:"
    Write-Host "  GPU:                $gpuName"
    Write-Host "  VRAM:               $gpuRamMB MB"
    Write-Host "  Resolution:         $screenResolution"
    Write-Host "  Screen Size:        $screenSize"
    Write-Host ""
    Write-Host "OPERATING SYSTEM:"
    Write-Host "  OS:                 $osName"
    Write-Host "  Version:            $osVersion (Build $osBuild)"
    Write-Host "  Architecture:       $osArch"
    Write-Host ""
    Write-Host "NETWORK:"
    Write-Host "  MAC Address:        $macAddress"
    Write-Host "  WiFi Adapter:       $wifiAdapter"
    Write-Host ""
    Write-Host "BATTERY:"
    Write-Host "  Status:             $batteryStatus"
    Write-Host "  Charge:             $batteryHealth"
    Write-Host ""
    Write-Host "BIOS:"
    Write-Host "  Version:            $biosVersion"
    Write-Host ""
    
    # Check for generic serial
    if ($serial -match "To Be Filled|Default|123456|000000|System Serial") {
        Write-Host "WARNING: Generic serial number detected!" -ForegroundColor Yellow
        $serial = Read-Host "Enter real serial number from sticker"
    }
    
    # ========== PREPARE DATA ==========
    $body = @{
        brand = $brand
        model = $model
        serial_number = $serial
        device_type = $deviceType
        grade = "B"
        specs = @{
            # System
            manufacturer = $brand
            model_number = $model
            part_number = $partNumber
            motherboard = $motherboard
            bios_version = $biosVersion
            
            # Processor
            processor = $cpuName
            processor_cores = $cpuCores
            processor_threads = $cpuThreads
            processor_speed_mhz = $cpuSpeed
            processor_architecture = $cpuArch
            
            # Memory
            ram_gb = $totalRamGB
            ram_type = $ramType
            ram_speed_mhz = $ramSpeed
            ram_slots = $ramSlots
            
            # Storage
            storage_gb = $diskSizeGB
            storage_type = $diskType
            storage_model = $diskModel
            all_storage = $allStorage
            
            # Graphics
            graphics_card = $gpuName
            graphics_vram_mb = $gpuRamMB
            graphics_driver = $gpuDriver
            all_gpus = $allGPUs
            
            # Display
            screen_resolution = $screenResolution
            screen_size = $screenSize
            monitor_count = $monitorCount
            
            # Operating System
            os_name = $osName
            os_version = $osVersion
            os_build = $osBuild
            os_architecture = $osArch
            
            # Network
            mac_address = $macAddress
            wifi_adapter = $wifiAdapter
            
            # Battery
            has_battery = $hasBattery
            battery_status = $batteryStatus
            
            # Scan Info
            scanned_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            scanned_by = $env:USERNAME
            computer_name = $env:COMPUTERNAME
        }
        status = "pending_triage"
        location = "Receiving"
    } | ConvertTo-Json -Depth 5
    
    Write-Host "========================================"
    Write-Host "Uploading to server..."
    Write-Host ""
    
    $headers = @{
        "apikey" = $API_KEY
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body
        
        Write-Host "========================================"
        Write-Host "   SUCCESS!" -ForegroundColor Green
        Write-Host "========================================"
        Write-Host ""
        Write-Host "Device registered: $serial"
        Write-Host "All specs saved to database!"
        
        # Open in browser
        $OpenUrl = "https://xmlproject.vercel.app/inventory?search=$serial"
        Write-Host ""
        Write-Host "Opening in browser..." -ForegroundColor Cyan
        Start-Process $OpenUrl
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
        }
        catch {
            $responseBody = "Could not read response"
        }
        
        Write-Host "========================================"
        Write-Host "   ERROR (Code: $statusCode)" -ForegroundColor Red
        Write-Host "========================================"
        Write-Host ""
        Write-Host "Server response:"
        Write-Host $responseBody
        Write-Host ""
        
        if ($statusCode -eq 409) {
            Write-Host "This device is already registered!"
        }
    }

} catch {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "   SCRIPT ERROR" -ForegroundColor Red
    Write-Host "========================================"
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
