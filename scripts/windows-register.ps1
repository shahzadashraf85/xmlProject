# LapTek Device Auto-Registration Script for Windows
# Double-click to run (Right-click > Run with PowerShell if needed)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LapTek Device Auto-Registration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device"
$API_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"  # Replace with your actual key

Write-Host "Detecting hardware specifications..." -ForegroundColor Yellow

try {
    # Gather System Information
    $computerInfo = Get-ComputerInfo
    $processor = Get-CimInstance Win32_Processor | Select-Object -First 1
    $disk = Get-CimInstance Win32_DiskDrive | Select-Object -First 1
    $bios = Get-CimInstance Win32_BIOS
    $os = Get-CimInstance Win32_OperatingSystem

    # Extract Details
    $brand = $computerInfo.CsManufacturer
    $model = $computerInfo.CsModel
    $serialNumber = $bios.SerialNumber
    $cpuName = $processor.Name
    $cpuCores = $processor.NumberOfCores
    $ramGB = [math]::Round($computerInfo.CsTotalPhysicalMemory / 1GB, 2)
    $diskSizeGB = [math]::Round($disk.Size / 1GB, 0)
    $osName = $os.Caption
    $osVersion = $os.Version

    # Display Detected Info
    Write-Host ""
    Write-Host "Detected Information:" -ForegroundColor Green
    Write-Host "  Brand:        $brand" -ForegroundColor White
    Write-Host "  Model:        $model" -ForegroundColor White
    Write-Host "  Serial:       $serialNumber" -ForegroundColor White
    Write-Host "  CPU:          $cpuName" -ForegroundColor White
    Write-Host "  RAM:          $ramGB GB" -ForegroundColor White
    Write-Host "  Storage:      $diskSizeGB GB" -ForegroundColor White
    Write-Host "  OS:           $osName ($osVersion)" -ForegroundColor White
    Write-Host ""

    # Prepare JSON Payload
    $payload = @{
        brand = $brand
        model = $model
        serial_number = $serialNumber
        device_type = "LAPTOP"
        grade = "B"
        specs = @{
            processor = $cpuName
            cpu_cores = $cpuCores
            ram = "$ramGB GB"
            storage = "$diskSizeGB GB"
            os = "$osName $osVersion"
        }
        status = "pending_triage"
        location = "Receiving"
    } | ConvertTo-Json -Depth 3

    Write-Host "Uploading to LapTek Inventory System..." -ForegroundColor Yellow

    # Send to API
    $headers = @{
        "apikey" = $API_KEY
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $payload

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ REGISTRATION SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Device has been added to inventory." -ForegroundColor White
    Write-Host "Serial Number: $serialNumber" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ REGISTRATION FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Internet connection is active" -ForegroundColor White
    Write-Host "  2. API_KEY is configured in the script" -ForegroundColor White
    Write-Host "  3. Supabase Edge Function is deployed" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
