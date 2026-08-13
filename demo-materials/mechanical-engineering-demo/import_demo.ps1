param(
  [string]$BaseUrl = "http://127.0.0.1:8000/api/v1",
  [string]$Username = "admin",
  [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

function From-Utf8Base64([string]$Value) {
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

function Invoke-CurlJson(
  [string]$Method,
  [string]$Uri,
  $Body = $null,
  [hashtable]$Headers = @{}
) {
  $responsePath = [IO.Path]::GetTempFileName()
  $requestPath = $null
  $args = @("-sS", "-X", $Method, $Uri, "-o", $responsePath, "-w", "%{http_code}")
  foreach ($key in $Headers.Keys) {
    $args += @("-H", "${key}: $($Headers[$key])")
  }
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 8 -Compress
    $requestPath = [IO.Path]::GetTempFileName()
    $utf8NoBom = New-Object Text.UTF8Encoding $false
    [IO.File]::WriteAllText($requestPath, $json, $utf8NoBom)
    $args += @("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", "@$requestPath")
  }

  try {
    $statusCode = & curl.exe @args
    $curlExitCode = $LASTEXITCODE
    $response = [IO.File]::ReadAllText($responsePath, [Text.Encoding]::UTF8)
    if ($curlExitCode -ne 0) {
      throw "curl request failed with exit code $curlExitCode"
    }
    if ($statusCode -lt 200 -or $statusCode -ge 300) {
      throw "HTTP $statusCode $Method $Uri failed: $response"
    }
    if (-not $response) {
      return $null
    }
    return $response | ConvertFrom-Json
  }
  finally {
    Remove-Item -LiteralPath $responsePath -ErrorAction SilentlyContinue
    if ($requestPath) {
      Remove-Item -LiteralPath $requestPath -ErrorAction SilentlyContinue
    }
  }
}

$fileName = "01_mechanical_manufacturing_lab_guide.txt"
$majorName = From-Utf8Base64 "5py65qKw6K6+6K6h5Yi26YCg5Y+K5YW26Ieq5Yqo5YyW"
$schoolName = From-Utf8Base64 "56S65L6L5aSn5a2m5py65qKw5bel56iL5a2m6Zmi"
$majorDescription = From-Utf8Base64 "6Z2i5ZCR5py65qKw6K6+6K6h44CB5Yi26YCg5bel6Im644CB5pWw5o6n5Yqg5bel5ZKM5pm66IO95Yi26YCg55qE6K6k6K+B5ryU56S65LiT5Lia44CC"
$course = From-Utf8Base64 "5py65qKw5Yi26YCg5bel6Im65Z+656GA"
$category = From-Utf8Base64 "5a6e6aqM5oyH5a+85Lmm"

$materialPath = Join-Path $PSScriptRoot $fileName
if (-not (Test-Path -LiteralPath $materialPath)) {
  throw ((From-Utf8Base64 "5om+5LiN5Yiw5ryU56S65p2Q5paZ77yaJG1hdGVyaWFsUGF0aA==") -replace '\$materialPath', $materialPath)
}

$loginUri = "${BaseUrl}/auth/login"
$majorsUri = "${BaseUrl}/majors"
$resourcesUri = "${BaseUrl}/resources"
$uploadUri = "${BaseUrl}/resources/upload"

$login = Invoke-CurlJson -Method "POST" -Uri $loginUri -Body @{ username = $Username; password = $Password }

$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }

$majors = Invoke-CurlJson -Method "GET" -Uri $majorsUri -Headers $headers
$major = $majors | Where-Object { $_.name -eq $majorName } | Select-Object -First 1

if (-not $major) {
  $majorPayload = @{
    name = $majorName
    code = "080202"
    schoolName = $schoolName
    description = $majorDescription
  }

  $major = Invoke-CurlJson -Method "POST" -Uri $majorsUri -Headers $headers -Body $majorPayload
}

$uploadHeaders = @{
  Authorization = "Bearer $token"
  "X-Major-Id" = $major.id
}

$encodedCourse = [uri]::EscapeDataString($course)
$existing = Invoke-CurlJson -Method "GET" -Uri "${resourcesUri}?course=$encodedCourse" -Headers $uploadHeaders

$resource = $existing |
  Where-Object { $_.fileName -eq $fileName } |
  Select-Object -First 1

if (-not $resource) {
  $uploadResponse = & curl.exe -sS -X POST $uploadUri `
    -H "Authorization: Bearer $token" `
    -H "X-Major-Id: $($major.id)" `
    -F "file=@$materialPath;type=text/plain" `
    -F "course=$course" `
    -F "category=$category"
  if ($LASTEXITCODE -ne 0) {
    throw "curl upload failed with exit code $LASTEXITCODE"
  }
  $resource = $uploadResponse | ConvertFrom-Json
}

[pscustomobject]@{
  majorId = $major.id
  majorName = $major.name
  resourceId = $resource.id
  fileName = $resource.fileName
  status = $resource.status
} | Format-List
