# ========================================
#  LAPTEK DEVICE REGISTRATION
# ========================================

$ErrorActionPreference = "Stop"

try {
    $API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2F0d3l0anp2bGhkbWNrZnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDU2NTAsImV4cCI6MjA1MTA4MTY1MH0.sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"
    $API_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device"

    Write-Host ""
    Write-Host "========================================"
    Write-Host "   LAPTEK DEVICE REGISTRATION"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Scanning device..."

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
    
    Write-Host ""
    Write-Host "FOUND:"
    Write-Host "  Brand: $brand"
    Write-Host "  Model: $model"
    Write-Host "  Serial: $serial"
    Write-Host "  CPU: $processor"
    Write-Host "  RAM: $ramGB GB"
    Write-Host "  Storage: $storageGB GB"
    Write-Host ""
    
    if ($serial -match "To Be Filled|Default|123456|000000") {
        Write-Host "WARNING: Generic serial number!"
        $serial = Read-Host "Enter real serial number"
    }
    
    $body = @{
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
        Write-Host "   SUCCESS!"
        Write-Host "========================================"
        Write-Host "Device registered: $serial"
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        # Try to get the response body for more details
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
        }
        catch {
            $responseBody = "Could not read response"
        }
        
        Write-Host "========================================"
        Write-Host "   ERROR (Code: $statusCode)"
        Write-Host "========================================"
        Write-Host ""
        Write-Host "Server response:"
        Write-Host $responseBody
        Write-Host ""
        
        if ($statusCode -eq 409) {
            Write-Host "This device is already registered!"
        }
        elseif ($statusCode -eq 500) {
            Write-Host "Server error. The database table may not exist."
            Write-Host "Ask admin to run the SQL migration."
        }
    }

} catch {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "   SCRIPT ERROR"
    Write-Host "========================================"
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
