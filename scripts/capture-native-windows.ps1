$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$OutputDir = if ($env:MAAKDOWN_SCREENSHOT_DIR) {
    $env:MAAKDOWN_SCREENSHOT_DIR
} else {
    Join-Path $RepoRoot "output/native-screenshots"
}
$App = Join-Path $RepoRoot "build/bin/Maakdown.exe"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$Scenarios = node (Join-Path $RepoRoot "scripts/native-screenshot-scenarios.mjs") $RepoRoot
foreach ($Scenario in $Scenarios) {
    $Parts = $Scenario -split "`t"
    $Slug = $Parts[0]
    $FixtureArgs = @()
    for ($Index = 1; $Index -lt $Parts.Length; $Index++) {
        $FixtureArgs += $Parts[$Index]
    }

    foreach ($Theme in @("light", "dark")) {
        $ConfigRoot = Join-Path ([System.IO.Path]::GetTempPath()) "maakdown-visual-$Slug-$Theme-$PID"
        $env:APPDATA = $ConfigRoot
        $State = Join-Path $ConfigRoot "Maakdown/state.json"
        node (Join-Path $RepoRoot "scripts/write-native-visual-state.mjs") $Theme $State

        $Log = Join-Path $OutputDir "windows-$Slug-$Theme.log"
        $ErrLog = "$Log.stderr"
        $ArgumentList = $FixtureArgs | ForEach-Object { "`"$_`"" }
        $Process = Start-Process -FilePath $App -ArgumentList $ArgumentList `
            -RedirectStandardOutput $Log -RedirectStandardError $ErrLog -PassThru
        try {
            # Allow code highlighting and Mermaid to finish in the real WebView2.
            Start-Sleep -Seconds 10
            $Bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
            $Bitmap = New-Object System.Drawing.Bitmap $Bounds.Width, $Bounds.Height
            $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
            try {
                $Graphics.CopyFromScreen($Bounds.Left, $Bounds.Top, 0, 0, $Bitmap.Size)
                $Bitmap.Save(
                    (Join-Path $OutputDir "windows-$Slug-$Theme.png"),
                    [System.Drawing.Imaging.ImageFormat]::Png
                )
            } finally {
                $Graphics.Dispose()
                $Bitmap.Dispose()
            }
        } finally {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
            Wait-Process -Id $Process.Id -ErrorAction SilentlyContinue
            if (Test-Path $ErrLog) {
                Get-Content $ErrLog | Add-Content $Log
                for ($Attempt = 0; $Attempt -lt 5 -and (Test-Path $ErrLog); $Attempt++) {
                    Remove-Item $ErrLog -Force -ErrorAction SilentlyContinue
                    if (Test-Path $ErrLog) {
                        Start-Sleep -Milliseconds 250
                    }
                }
            }
            Remove-Item -Recurse -Force $ConfigRoot -ErrorAction SilentlyContinue
        }
    }
}
