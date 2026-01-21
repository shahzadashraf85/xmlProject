# Debug Registration Script
$ErrorActionPreference = "Continue"

$SUPABASE_URL = "https://xqsatwytjzvlhdmckfsb.supabase.co"
$API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2F0d3l0anp2bGhkbWNrZnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDU2NTAsImV4cCI6MjA1MTA4MTY1MH0.sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"

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
    }
}

Read-Host "Press Enter"
