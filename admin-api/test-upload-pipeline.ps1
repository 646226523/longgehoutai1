# upload pipeline test script
$base = "http://localhost:3015"

# Step 1: Login
Write-Host "=== Step 1: Login ===" -ForegroundColor Cyan
$loginResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
$token = $loginResp.data.accessToken
Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Green

$headers = @{ Authorization = "Bearer $token" }

# Step 2: Check current image configs
Write-Host "`n=== Step 2: Current image configs ===" -ForegroundColor Cyan
$cfgResp = Invoke-RestMethod -Uri "$base/api/system/configs" -Headers $headers
$cfgResp.data.list | Where-Object { $_.config_key -like "image_*" } | ForEach-Object {
    Write-Host "  $($_.config_key) = $($_.config_value)"
}

# Step 3: Enable watermark
Write-Host "`n=== Step 3: Enable watermark ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$base/api/system/configs/image_watermark_enable" -Method PUT -Headers $headers -ContentType "application/json" -Body '{"config_value":"1"}' | Out-Null
Invoke-RestMethod -Uri "$base/api/system/configs/image_watermark_text" -Method PUT -Headers $headers -ContentType "application/json" -Body '{"config_value":"赛鸽基因"}' | Out-Null
Invoke-RestMethod -Uri "$base/api/system/configs/image_watermark_position" -Method PUT -Headers $headers -ContentType "application/json" -Body '{"config_value":"bottom-right"}' | Out-Null
Write-Host "Watermark enabled (赛鸽基因, bottom-right)" -ForegroundColor Green

# Step 4: Read test image and upload WITH watermark
Write-Host "`n=== Step 4: Upload WITH watermark ===" -ForegroundColor Cyan
$testImg = "p:\龙鸽项目\longgehoutai\test-input.jpg"
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($testImg))
$bodyWithWm = @{ data = "data:image/jpeg;base64,$b64" } | ConvertTo-Json -Compress
$respWithWm = Invoke-RestMethod -Uri "$base/api/upload" -Method POST -Headers $headers -ContentType "application/json" -Body $bodyWithWm
Write-Host "Response (with watermark):" -ForegroundColor Green
$respWithWm | ConvertTo-Json -Depth 5

# Record file sizes
$urlWithWm = $respWithWm.data.url
$fileNameWithWm = [IO.Path]::GetFileName($urlWithWm)
$filePathWithWm = "p:\龙鸽项目\longgehoutai\admin-api\uploads\$fileNameWithWm"
$sizeWithWm = (Get-Item $filePathWithWm).Length
Write-Host "Original file size (with wm): $sizeWithWm bytes" -ForegroundColor Green

# Check thumbnails exist
Write-Host "`nThumbnail files (with wm):" -ForegroundColor Green
foreach ($sizeKey in @("large","medium","small")) {
    $thumbPath = "p:\龙鸽项目\longgehoutai\admin-api\uploads\thumbs\$sizeKey\$fileNameWithWm"
    if (Test-Path $thumbPath) {
        $sz = (Get-Item $thumbPath).Length
        Write-Host "  thumbs/$sizeKey/$fileNameWithWm -> $sz bytes"
    } else {
        Write-Host "  thumbs/$sizeKey/$fileNameWithWm -> NOT FOUND" -ForegroundColor Red
    }
}

# Step 5: Disable watermark
Write-Host "`n=== Step 5: Disable watermark ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$base/api/system/configs/image_watermark_enable" -Method PUT -Headers $headers -ContentType "application/json" -Body '{"config_value":"0"}' | Out-Null
Write-Host "Watermark disabled" -ForegroundColor Green

# Step 6: Upload same image WITHOUT watermark
Write-Host "`n=== Step 6: Upload WITHOUT watermark ===" -ForegroundColor Cyan
$bodyNoWm = @{ data = "data:image/jpeg;base64,$b64" } | ConvertTo-Json -Compress
$respNoWm = Invoke-RestMethod -Uri "$base/api/upload" -Method POST -Headers $headers -ContentType "application/json" -Body $bodyNoWm
Write-Host "Response (no watermark):" -ForegroundColor Green
$respNoWm | ConvertTo-Json -Depth 5

$urlNoWm = $respNoWm.data.url
$fileNameNoWm = [IO.Path]::GetFileName($urlNoWm)
$filePathNoWm = "p:\龙鸽项目\longgehoutai\admin-api\uploads\$fileNameNoWm"
$sizeNoWm = (Get-Item $filePathNoWm).Length
Write-Host "Original file size (no wm): $sizeNoWm bytes" -ForegroundColor Green

# Check thumbnails
Write-Host "`nThumbnail files (no wm):" -ForegroundColor Green
foreach ($sizeKey in @("large","medium","small")) {
    $thumbPath = "p:\龙鸽项目\longgehoutai\admin-api\uploads\thumbs\$sizeKey\$fileNameNoWm"
    if (Test-Path $thumbPath) {
        $sz = (Get-Item $thumbPath).Length
        Write-Host "  thumbs/$sizeKey/$fileNameNoWm -> $sz bytes"
    } else {
        Write-Host "  thumbs/$sizeKey/$fileNameNoWm -> NOT FOUND" -ForegroundColor Red
    }
}

# Step 7: Summary
Write-Host "`n=== Step 7: SUMMARY ===" -ForegroundColor Cyan
Write-Host "Original size WITH wm : $sizeWithWm bytes"
Write-Host "Original size WITHOUT wm: $sizeNoWm bytes"
Write-Host "Diff: $($sizeWithWm - $sizeNoWm) bytes"
Write-Host ""

# List all files in thumbs dir
Write-Host "All files under uploads/thumbs/:" -ForegroundColor Cyan
Get-ChildItem "p:\龙鸽项目\longgehoutai\admin-api\uploads\thumbs" -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Replace("p:\龙鸽项目\longgehoutai\admin-api\uploads\", "")
    Write-Host "  $rel ($($_.Length) bytes)"
}
