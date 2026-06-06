param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactPath
)

$ErrorActionPreference = "Stop"

if (-not $env:MAAKDOWN_WINDOWS_CERT_PATH) { throw "Set MAAKDOWN_WINDOWS_CERT_PATH" }
if (-not $env:MAAKDOWN_WINDOWS_CERT_PASSWORD) { throw "Set MAAKDOWN_WINDOWS_CERT_PASSWORD" }
if (-not $env:MAAKDOWN_WINDOWS_TIMESTAMP_URL) { throw "Set MAAKDOWN_WINDOWS_TIMESTAMP_URL" }

& signtool sign `
    /f $env:MAAKDOWN_WINDOWS_CERT_PATH `
    /p $env:MAAKDOWN_WINDOWS_CERT_PASSWORD `
    /fd SHA256 `
    /tr $env:MAAKDOWN_WINDOWS_TIMESTAMP_URL `
    /td SHA256 `
    $ArtifactPath

& signtool verify /pa /all /v $ArtifactPath
