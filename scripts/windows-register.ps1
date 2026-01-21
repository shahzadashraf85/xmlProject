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
    Write-Host "(Note: Use your full email address, e.g., user@example.com)" -ForegroundColor White
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

    # Auto-Login to Web App
    $openUrl = "https://xmlproject.vercel.app/inventory?search=$serialNumber&access_token=$accessToken&refresh_token=$refreshToken"
    Write-Host "Opening web dashboard..." -ForegroundColor Yellow
    Start-Process $openUrl

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
