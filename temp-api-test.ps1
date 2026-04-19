$API_URL = "http://localhost:3000"

function Send-Request {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null
    )

    $headers = @{ 'Content-Type' = 'application/json' }
    if ($Body) {
        return Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body $Body -ErrorAction Stop -StatusCodeVariable statusCode, response
    } else {
        return Invoke-RestMethod -Uri $Url -Method $Method -ErrorAction Stop -StatusCodeVariable statusCode, response
    }
}

Write-Host "=== API Manual Tests ==="

Write-Host "Health check:"
try {
    $r = Invoke-WebRequest -Uri $API_URL -UseBasicParsing -Method Get -ErrorAction Stop
    Write-Host "OK" $r.StatusCode
} catch {
    Write-Host "FAIL" $_.Exception.Message
}
Write-Host ""

Write-Host "Invalid job type test:"
try {
    $resp = Invoke-RestMethod -Uri "$API_URL/api/create-job" -Method Post -Headers @{ 'Content-Type' = 'application/json' } -Body '{"type":"podcast","input":"https://example.com/audio.mp3"}' -ErrorAction Stop
    Write-Host "UNEXPECTED PASS" ($resp | ConvertTo-Json)
} catch {
    if ($_.Exception.Response) {
        $text = $_.Exception.Response.Content
        Write-Host "RESPONSE" $text
        if ($text -match 'INVALID_TYPE') { Write-Host "PASS invalid type" } else { Write-Host "FAIL invalid type" }
    } else {
        Write-Host "ERROR" $_.Exception.Message
    }
}
Write-Host ""

Write-Host "Create job test:"
$jobId = $null
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/create-job" -Method Post -Headers @{ 'Content-Type' = 'application/json' } -Body '{"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' -ErrorAction Stop
    Write-Host "BODY" ($response | ConvertTo-Json)
    if ($response.job_id) {
        Write-Host "PASS create job" $response.job_id
        $jobId = $response.job_id
    } else {
        Write-Host "FAIL create job - missing job_id"
    }
} catch {
    if ($_.Exception.Response) {
        Write-Host "FAIL create job" $_.Exception.Response.Content
    } else {
        Write-Host "ERROR create job" $_.Exception.Message
    }
}
Write-Host ""

if ($jobId) {
    Write-Host "Poll job status:"
    try {
        $statusResponse = Invoke-RestMethod -Uri "$API_URL/api/job-status?job_id=$jobId" -Method Get -ErrorAction Stop
        Write-Host "STATUS BODY" ($statusResponse | ConvertTo-Json)
        Write-Host "PASS poll status"
    } catch {
        if ($_.Exception.Response) {
            Write-Host "FAIL poll status" $_.Exception.Response.Content
        } else {
            Write-Host "ERROR poll status" $_.Exception.Message
        }
    }
    Write-Host ""
}

Write-Host "Nonexistent job test:"
try {
    $dummy = Invoke-RestMethod -Uri "$API_URL/api/job-status?job_id=nonexistent" -Method Get -ErrorAction Stop
    Write-Host "UNEXPECTED PASS nonexistent job" ($dummy | ConvertTo-Json)
} catch {
    if ($_.Exception.Response) {
        $text = $_.Exception.Response.Content
        Write-Host "RESPONSE" $text
        if ($text -match 'JOB_NOT_FOUND') { Write-Host "PASS nonexistent job" } else { Write-Host "FAIL nonexistent job" }
    } else {
        Write-Host "ERROR nonexistent job" $_.Exception.Message
    }
}
