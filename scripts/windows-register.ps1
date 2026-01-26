# LapTek Device Auto-Registration Script for Windows
# Double-click to run (Right-click > Run with PowerShell if needed)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LapTek Device Auto-Registration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SUPABASE_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co"
$API_URL = "$SUPABASE_URL/functions/v1/register-device"
$API_KEY = "sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"

# --- AUTHENTICATION ---
Write-Host "Locked: AUTHENTICATION REQUIRED" -ForegroundColor Yellow
Write-Host "Please enter your LapTek credentials to proceed." -ForegroundColor White
$authEmail = Read-Host "Email"
$authPassword = Read-Host "Password" -AsSecureString
# Convert SecureString back to plain text for the API call (safe in memory for this transient use)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($authPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

Write-Host ""
Write-Host "Authenticating..." -ForegroundColor Gray

try {
    $authPayload = @{
        email = $authEmail
        password = $plainPassword
    } | ConvertTo-Json

    $authHeaders = @{
        "apikey" = $API_KEY
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }

    $authResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" -Method POST -Headers $authHeaders -Body $authPayload -ErrorAction Stop
    $accessToken = $authResponse.access_token
    $refreshToken = $authResponse.refresh_token

    if (-not $accessToken) {
        throw "No access token received."
    }

    Write-Host "✓ Authenticated as $authEmail" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "✗ Authentication Failed!" -ForegroundColor Red
    
    # Try to extract more detailed error from the response body
    $detailedError = ""
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $detailedError = $reader.ReadToEnd()
        $reader.Close()
    } catch {}

    if ($detailedError) {
        Write-Host "Server Response: $detailedError" -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Check your email/password and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

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

    # ===== CHECK FOR DUPLICATE SERIAL NUMBER =====
    Write-Host "Checking for existing registration..." -ForegroundColor Yellow
    
    try {
        $checkHeaders = @{
            "apikey" = $API_KEY
            "Authorization" = "Bearer $API_KEY"
        }
        
        $checkUrl = "$SUPABASE_URL/rest/v1/inventory_items?serial_number=eq.$serialNumber&select=id,brand,model,created_at"
        $existingDevice = Invoke-RestMethod -Uri $checkUrl -Method GET -Headers $checkHeaders -ErrorAction Stop
        
        if ($existingDevice -and $existingDevice.Count -gt 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Yellow
            Write-Host "  ⚠ DEVICE ALREADY REGISTERED" -ForegroundColor Yellow
            Write-Host "========================================" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "This device is already in the inventory system." -ForegroundColor White
            Write-Host "Serial Number: $serialNumber" -ForegroundColor Cyan
            Write-Host "Registered on: $($existingDevice[0].created_at)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "No duplicate entry will be created." -ForegroundColor White
            Write-Host ""
            
            # Shutdown the PC
            Write-Host "Shutting down PC in 10 seconds..." -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to cancel shutdown." -ForegroundColor Gray
            shutdown /s /t 10 /c "Laptop already registered - Auto shutdown"
            Start-Sleep -Seconds 11
            exit 0
        }
        
        Write-Host "✓ Serial number is unique. Proceeding with registration..." -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Host "⚠ Could not verify serial number uniqueness. Proceeding anyway..." -ForegroundColor Yellow
        Write-Host ""
    }
    # ===== END DUPLICATE CHECK =====

    # ===== ASK FOR GRADE =====
    Write-Host "Please enter the laptop grade:" -ForegroundColor Yellow
    Write-Host "  A - Excellent condition" -ForegroundColor Gray
    Write-Host "  B - Good condition" -ForegroundColor Gray
    Write-Host "  C - Fair condition" -ForegroundColor Gray
    
    do {
        $grade = Read-Host "Grade (A/B/C)"
        $grade = $grade.ToUpper().Trim()
        
        if ($grade -notin @("A", "B", "C")) {
            Write-Host "Invalid grade. Please enter A, B, or C." -ForegroundColor Red
        }
    } while ($grade -notin @("A", "B", "C"))
    
    Write-Host "✓ Grade set to: $grade" -ForegroundColor Green
    Write-Host ""
    # ===== END GRADE INPUT =====

    # Prepare JSON Payload
    $payload = @{
        brand = $brand
        model = $model
        serial_number = $serialNumber
        device_type = "LAPTOP"
        grade = $grade
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

    # Send to API using the Authenticated Token
    $headers = @{
        "apikey" = $API_KEY
        "Authorization" = "Bearer $accessToken"
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

    # Shutdown the PC
    Write-Host "Shutting down PC in 10 seconds..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to cancel shutdown." -ForegroundColor Gray
    shutdown /s /t 10 /c "Laptop registration complete - Auto shutdown"
    Start-Sleep -Seconds 11

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
    Write-Host "  2. You have valid credentials" -ForegroundColor White
    Write-Host "  3. This device isn't already registered" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
