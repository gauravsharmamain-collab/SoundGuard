# ==============================================================================
# SoundGuard Backend & API Verification Test Suite (PowerShell)
# ==============================================================================
# Usage:
#   .\test_api.ps1
#   .\test_api.ps1 -BaseUrl "http://localhost:5000"
# ==============================================================================

param (
    [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🛡️  SOUNDGUARD API ENDPOINT VERIFICATION TEST SUITE" -ForegroundColor Cyan
Write-Host "Target Server: $BaseUrl" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$TotalTests = 0
$PassedTests = 0

function Assert-Test {
    param (
        [string]$TestName,
        [bool]$Condition,
        [string]$Details = ""
    )
    $script:TotalTests++
    if ($Condition) {
        $script:PassedTests++
        Write-Host " [PASS] $TestName" -ForegroundColor Green
        if ($Details) { Write-Host "        $Details" -ForegroundColor Gray }
    } else {
        Write-Host " [FAIL] $TestName" -ForegroundColor Red
        if ($Details) { Write-Host "        $Details" -ForegroundColor Yellow }
    }
}

# 1. Test GET /api/health
Write-Host "`n[1/8] Testing Backend Health Check..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get
    Assert-Test -TestName "GET /api/health returns healthy" -Condition ($res.status -eq "healthy") -Details "Uptime: $($res.uptime)s"
} catch {
    Assert-Test -TestName "GET /api/health reachable" -Condition $false -Details $_.Exception.Message
}

# 2. Test POST /api/device/heartbeat
Write-Host "`n[2/8] Testing ESP32 Heartbeat Telemetry..." -ForegroundColor Yellow
try {
    $body = @{
        device_id = "soundguard_01"
        status = "online"
        wifi_rssi = -64
        firmware_version = "1.2.0-TinyML"
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$BaseUrl/api/device/heartbeat" -Method Post -Body $body -ContentType "application/json"
    Assert-Test -TestName "POST /api/device/heartbeat registers heartbeat" -Condition ($res.success -eq $true -and $res.device.device_id -eq "soundguard_01") -Details "Device status: $($res.device.status), RSSI: $($res.device.wifi_rssi) dBm"
} catch {
    Assert-Test -TestName "POST /api/device/heartbeat" -Condition $false -Details $_.Exception.Message
}

# 3. Test GET /api/device/status
Write-Host "`n[3/8] Testing Device Status Evaluation (<30s timeout)..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/device/status" -Method Get
    Assert-Test -TestName "GET /api/device/status marks device online" -Condition ($res.is_online -eq $true) -Details "Seconds since last seen: $($res.primary_device.seconds_since_last_seen)s"
} catch {
    Assert-Test -TestName "GET /api/device/status" -Condition $false -Details $_.Exception.Message
}

# 4. Test POST /api/detections with Door Knock
Write-Host "`n[4/8] Testing Sound Detection Ingestion (Door Knock)..." -ForegroundColor Yellow
$testDetectionId = 0
try {
    $detectionPayload = @{
        device_id = "soundguard_01"
        sound = "door_knock"
        confidence = 0.94
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        is_test = 1
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$BaseUrl/api/detections" -Method Post -Body $detectionPayload -ContentType "application/json"
    $testDetectionId = $res.detection.id
    Assert-Test -TestName "POST /api/detections accepts door_knock" -Condition ($res.success -eq $true -and $res.detection.sound -eq "door_knock") -Details "Created Detection ID #$($res.detection.id), Conf: $($res.detection.confidence_pct)%"
} catch {
    Assert-Test -TestName "POST /api/detections (door_knock)" -Condition $false -Details $_.Exception.Message
}

# 5. Test Threshold Rejection (Confidence < 0.70)
Write-Host "`n[5/8] Testing Confidence Threshold Enforcement..." -ForegroundColor Yellow
try {
    $lowConfPayload = @{
        device_id = "soundguard_01"
        sound = "clapping"
        confidence = 0.45
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$BaseUrl/api/detections" -Method Post -Body $lowConfPayload -ContentType "application/json"
    Assert-Test -TestName "Low confidence detection rejected" -Condition $false -Details "Server should have rejected confidence 0.45"
} catch {
    $is422Or400 = $_.Exception.Response.StatusCode.value__ -in @(400, 422)
    Assert-Test -TestName "Low confidence detection rejected properly" -Condition $is422Or400 -Details "HTTP Status: $($_.Exception.Response.StatusCode.value__)"
}

# 6. Test GET /api/detections (Query History from SQLite)
Write-Host "`n[6/8] Testing SQLite History Persistence..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/detections?limit=5" -Method Get
    Assert-Test -TestName "GET /api/detections retrieves saved SQLite records" -Condition ($res.success -eq $true -and $res.data.Count -gt 0) -Details "Found $($res.pagination.total) total events in database"
} catch {
    Assert-Test -TestName "GET /api/detections" -Condition $false -Details $_.Exception.Message
}

# 7. Test PATCH /api/detections/:id/acknowledge
Write-Host "`n[7/8] Testing Alert Acknowledgement in SQLite..." -ForegroundColor Yellow
if ($testDetectionId -gt 0) {
    try {
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/detections/$testDetectionId/acknowledge" -Method Patch
        Assert-Test -TestName "PATCH /api/detections/:id/acknowledge updates SQLite" -Condition ($res.success -eq $true -and $res.detection.acknowledged -eq 1) -Details "Acknowledged at: $($res.detection.acknowledged_at)"
    } catch {
        Assert-Test -TestName "PATCH /api/detections/:id/acknowledge" -Condition $false -Details $_.Exception.Message
    }
} else {
    Write-Host " [SKIP] Acknowledgement test skipped (no test detection id)" -ForegroundColor Yellow
}

# 8. Test GET /api/stats
Write-Host "`n[8/8] Testing Dashboard Statistics Calculation..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/stats" -Method Get
    $stats = $res.stats
    $hasStats = ($stats.total_detections -ge 1 -and $stats.category_counts.door_knock -ge 1)
    Assert-Test -TestName "GET /api/stats computes metrics from database" -Condition $hasStats -Details "Total: $($stats.total_detections), Today: $($stats.today_detections), Most common: $($stats.most_common_sound.name)"
} catch {
    Assert-Test -TestName "GET /api/stats" -Condition $false -Details $_.Exception.Message
}

# Summary
$summaryColor = if ($PassedTests -eq $TotalTests) { "Green" } else { "Yellow" }
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY: $PassedTests / $TotalTests tests passed" -ForegroundColor $summaryColor
Write-Host "==========================================================" -ForegroundColor Cyan
