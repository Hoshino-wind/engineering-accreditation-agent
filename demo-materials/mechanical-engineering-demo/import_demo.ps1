param(
  [string]$BaseUrl = "http://127.0.0.1:8000/api/v1",
  [string]$Username = "admin",
  [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

$materialPath = Join-Path $PSScriptRoot "01_mechanical_manufacturing_lab_guide.txt"
if (-not (Test-Path -LiteralPath $materialPath)) {
  throw "找不到演示材料：$materialPath"
}

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/auth/login" `
  -ContentType "application/json" `
  -Body (@{ username = $Username; password = $Password } | ConvertTo-Json)

$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }

$majors = Invoke-RestMethod -Method Get -Uri "$BaseUrl/majors" -Headers $headers
$major = $majors | Where-Object { $_.name -eq "机械设计制造及其自动化" } | Select-Object -First 1

if (-not $major) {
  $majorPayload = @{
    name = "机械设计制造及其自动化"
    code = "080202"
    schoolName = "示例大学机械工程学院"
    description = "面向机械设计、制造工艺、数控加工和智能制造的认证演示专业。"
  } | ConvertTo-Json -Depth 5

  $major = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/majors" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $majorPayload
}

$uploadHeaders = @{
  Authorization = "Bearer $token"
  "X-Major-Id" = $major.id
}

$course = "机械制造工艺基础"
$encodedCourse = [uri]::EscapeDataString($course)
$existing = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/resources?course=$encodedCourse" `
  -Headers $uploadHeaders

$resource = $existing |
  Where-Object { $_.fileName -eq "01_mechanical_manufacturing_lab_guide.txt" } |
  Select-Object -First 1

if (-not $resource) {
  $resource = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/resources/upload" `
    -Headers $uploadHeaders `
    -Form @{
      file = Get-Item -LiteralPath $materialPath
      course = $course
      category = "实验指导书"
    }
}

[pscustomobject]@{
  majorId = $major.id
  majorName = $major.name
  resourceId = $resource.id
  fileName = $resource.fileName
  status = $resource.status
} | Format-List
