# ========================================
#  LAPTEK DEVICE REGISTRATION
#  Just Double-Click to Run!
# ========================================

# Prevent window from closing on error
$ErrorActionPreference = "Stop"

# Use simple error handling wrapper
try {
    # YOUR API KEY
    $API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2F0d3l0anp2bGhkbWNrZnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDU2NTAsImV4cCI6MjA1MTA4MTY1MH0.sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"
    $API_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   LAPTEK DEVICE REGISTRATION" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Scanning device..." -ForegroundColor Yellow
    Write-Host ""

    # Get device information
    $info = Get-ComputerInfo
    $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
    $disk = Get-CimInstance Win32_DiskDrive | Select-Object -First 1
    $bios = Get-CimInstance Win32_BIOS
    
    $brand = $info.CsManufacturer
    $model = $info.CsModel
    $serial = $bios.SerialNumber
    $processor = $cpu.Name
    $ramGB = [math]::Round($info.CsTotalPhysicalMemory / 1GB, 0)
    $storageGB = [math]::Round($disk.Size / 1GB, 0)
    
    # Show what was found
    Write-Host "FOUND:" -ForegroundColor Green
    Write-Host "  $brand $model" -ForegroundColor White
    Write-Host "  Serial: $serial" -ForegroundColor White
    Write-Host "  $processor" -ForegroundColor Gray
    Write-Host "  $ramGB GB RAM, $storageGB GB Storage" -ForegroundColor Gray
    Write-Host ""
    
    # Check for fake serial numbers
    if ($serial -match "To Be Filled|Default|O\.?E\.?M|123456|000000") {
        Write-Host "⚠️  WARNING: Generic serial number detected!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please type the REAL serial number from the sticker:" -ForegroundColor Yellow
        $serial = Read-Host "Serial Number"
    }
    
    # Prepare data
    $data = @{
        brand = $brand
        model = $model
        serial_number = $serial
        device_type = "LAPTOP"
        grade = "B"
        specs = @{
            processor = $processor
            ram = "$ramGB GB"
            storage = "$storageGB GB"
        }
        status = "pending_triage"
        location = "Receiving"
    } | ConvertTo-Json -Depth 3
    
    # Upload to database
    Write-Host "Uploading to system..." -ForegroundColor Yellow
    
    $headers = @{
        "apikey" = $API_KEY
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $data -ErrorAction Stop
    
    # Success!
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✓ SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Device registered: $serial" -ForegroundColor Cyan
    Write-Host ""

} catch {
    # Error handling
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ✗ ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    
    $errorMsg = $_.Exception.Message
    
    if ($errorMsg -match "409|duplicate|already") {
        Write-Host "This device is ALREADY registered!" -ForegroundColor Yellow
        Write-Host "Serial: $serial" -ForegroundColor Cyan
    } elseif ($errorMsg -match "network|connection") {
        Write-Host "No internet connection!" -ForegroundColor Red
        Write-Host "Please connect to WiFi and try again." -ForegroundColor Yellow
    } else {
        Write-Host "Something went wrong:" -ForegroundColor Red
        Write-Host $errorMsg -ForegroundColor Gray
    }
    
    Write-Host ""
}

# Always pause at the end
Write-Host "Press Enter to exit..." -ForegroundColor Gray
$null = Read-Host
