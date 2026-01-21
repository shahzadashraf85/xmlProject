# Debug Registration Script
$ErrorActionPreference = "Stop"

try {
    $SUPABASE_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co"
    $API_KEY = "sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"

    Write-Host "--- DEBUG MODE ---"
    $authEmail = Read-Host "Email"
    $authPassword = Read-Host "Password"

    $authPayload = @{
        email = $authEmail
        password = $authPassword
    } | ConvertTo-Json

    Write-Host "Payload: $authPayload"

    $headers = @{
        "apikey" = $API_KEY
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }

    Write-Host "Sending Request..."
    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
            -Method POST `
            -Headers $headers `
            -Body $authPayload
        
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host $response
    } catch {
        Write-Host "FAILED!" -ForegroundColor Red
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
        
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
            Write-Host "Body: $body"
            $reader.Close()
        } else {
             Write-Host "Error: $($_.Exception.Message)"
        }
    }
} catch {
    Write-Host "CRITICAL SCRIPT ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit..."
