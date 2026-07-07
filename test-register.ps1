$uri = "http://localhost:3000/api/register"
$body = @{
    name = "Test User"
    email = "testuser2@example.com"
    password = "password123"
} | ConvertTo-Json

$headers = @{ "Content-Type" = "application/json" }

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $body -Headers $headers
    Write-Host "Success:" $response
} catch {
    Write-Host "Error:" $_.Exception.Message
    Write-Host "Status:" $_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader $stream
    Write-Host "Body:" $reader.ReadToEnd()
}
