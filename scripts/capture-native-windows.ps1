$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$OutputDir = if ($env:MAAKDOWN_SCREENSHOT_DIR) {
    $env:MAAKDOWN_SCREENSHOT_DIR
} else {
    Join-Path $RepoRoot "output/native-screenshots"
}
$Fixture = Join-Path $RepoRoot "fixtures/native-rendering-smoke.md"
$App = Join-Path $RepoRoot "build/bin/Maakdown.exe"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
foreach ($Theme in @("light", "dark")) {
    $ConfigRoot = Join-Path ([System.IO.Path]::GetTempPath()) "maakdown-visual-$Theme-$PID"
    $env:APPDATA = $ConfigRoot
    $State = Join-Path $ConfigRoot "Maakdown/state.json"
    node (Join-Path $RepoRoot "scripts/write-native-visual-state.mjs") $Theme $State

    $Log = Join-Path $OutputDir "windows-$Theme.log"
    $Process = Start-Process -FilePath $App -ArgumentList "`"$Fixture`"" `
        -RedirectStandardOutput $Log -RedirectStandardError "$Log.stderr" -PassThru
    try {
        # Allow code highlighting and Mermaid to finish in the real WebView2.
        Start-Sleep -Seconds 10
        $Bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $Bitmap = New-Object System.Drawing.Bitmap $Bounds.Width, $Bounds.Height
        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
        try {
            $Graphics.CopyFromScreen($Bounds.Left, $Bounds.Top, 0, 0, $Bitmap.Size)
            $Bitmap.Save(
                (Join-Path $OutputDir "windows-$Theme.png"),
                [System.Drawing.Imaging.ImageFormat]::Png
            )
        } finally {
            $Graphics.Dispose()
            $Bitmap.Dispose()
        }
    } finally {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        Wait-Process -Id $Process.Id -ErrorAction SilentlyContinue
        if (Test-Path "$Log.stderr") {
            Get-Content "$Log.stderr" | Add-Content $Log
            Remove-Item "$Log.stderr" -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -Recurse -Force $ConfigRoot -ErrorAction SilentlyContinue
    }
}
