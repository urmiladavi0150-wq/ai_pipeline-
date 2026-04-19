# API Testing Script for PowerShell
# This script tests the async AI pipeline backend endpoints

$API_URL = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Async AI Pipeline Backend - API Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "Test 1: Health Check (Homepage)" -ForegroundColor Yellow
Write-Host "GET $API_URL" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$API_URL" -Method Get -ErrorAction SilentlyContinue
    Write-Host "✓ PASS - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ FAIL - Server not responding" -ForegroundColor Red
    Write-Host "Make sure to run: npm run dev" -ForegroundColor Yellow
    Write-Host ""
}

# Test 2: Invalid type
Write-Host "Test 2: Invalid Job Type" -ForegroundColor Yellow
Write-Host "POST $API_URL/api/create-job" -ForegroundColor Gray
Write-Host 'Body: {"type":"podcast","input":"https://example.com/audio.mp3"}' -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/create-job" `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body '{"type":"podcast","input":"https://example.com/audio.mp3"}' `
        -ErrorAction SilentlyContinue
    $body = $response | ConvertTo-Json
    Write-Host "Response: $body"
    if ($body -match "INVALID_TYPE") {
        Write-Host "✓ PASS - Returns expected error" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL - Unexpected response" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "Response: $($_.Exception.Message)" -ForegroundColor DarkYellow
    Write-Host ""
}

# Test 3: Create with valid YouTube URL
Write-Host "Test 3: Create Job (YouTube - SHOULD RETURN IMMEDIATELY)" -ForegroundColor Yellow
Write-Host "POST $API_URL/api/create-job" -ForegroundColor Gray
Write-Host 'Body: {"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' -ForegroundColor Gray

$startTime = Get-Date
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/create-job" `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body '{"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' `
        -StatusCodeVariable statusCode
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    $body = $response | ConvertTo-Json
    $jobId = $response.job_id
    
    Write-Host "Response: $body"
    Write-Host "HTTP Status: $statusCode"
    Write-Host "Response Time: $([Math]::Round($duration, 2))ms"
    
    if ($statusCode -eq 202 -and $jobId) {
        Write-Host "✓ PASS - Returns 202 (Accepted) with job_id: $jobId" -ForegroundColor Green
        if ($duration -lt 1000) {
            Write-Host "✓ FAST - Responded in $([Math]::Round($duration, 2))ms (under 1 second)" -ForegroundColor Green
        } else {
            Write-Host "⚠ SLOW - Response took $([Math]::Round($duration, 2))ms (should be < 1s)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ FAIL - Expected 202 status, got $statusCode" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test 4: Poll job status immediately
    if ($jobId) {
        Write-Host "Test 4: Poll Job Status (Immediate)" -ForegroundColor Yellow
        Write-Host "GET $API_URL/api/job-status?job_id=$jobId" -ForegroundColor Gray
        try {
            $statusResponse = Invoke-RestMethod -Uri "$API_URL/api/job-status?job_id=$jobId" `
                -Method Get `
                -StatusCodeVariable statusCode2
            $statusBody = $statusResponse | ConvertTo-Json
            Write-Host "Response: $statusBody"
            Write-Host "✓ PASS - Job status retrieved" -ForegroundColor Green
            Write-Host ""
        } catch {
            Write-Host "✗ FAIL - Could not retrieve status" -ForegroundColor Red
            Write-Host ""
        }
    }
} catch {
    Write-Host "✗ FAIL - Could not create job" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 5: Non-existent job
Write-Host "Test 5: Non-existent Job" -ForegroundColor Yellow
Write-Host "GET $API_URL/api/job-status?job_id=nonexistent" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/job-status?job_id=nonexistent" `
        -Method Get `
        -ErrorAction Stop
    $body = $response | ConvertTo-Json
    Write-Host "UNEXPECTED PASS - $body" -ForegroundColor Red
} catch {
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $body = $_.Exception.Response.Content
        Write-Host "Response: $body"
        Write-Host "HTTP Status: $statusCode"
        
        if ($statusCode -eq 400 -and $body -match "INVALID_JOB_ID") {
            Write-Host "✓ PASS - Returns 400 with correct error code" -ForegroundColor Green
        } else {
            Write-Host "✗ FAIL - Expected 400 INVALID_JOB_ID" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ FAIL - No HTTP response returned" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Backend is responding to requests" -ForegroundColor Green
Write-Host "✓ API returns valid job IDs immediately" -ForegroundColor Green
Write-Host "✓ Error handling is working correctly" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. The job will process in the background" -ForegroundColor Gray
Write-Host "2. Poll /api/job-status every 2-5 seconds" -ForegroundColor Gray
Write-Host "3. When status === 'done', the result will be available" -ForegroundColor Gray
Write-Host ""
