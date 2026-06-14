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
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeWindow {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

foreach ($Theme in @("light", "dark")) {
    $ConfigRoot = Join-Path ([System.IO.Path]::GetTempPath()) "maakdown-visual-$Theme-$PID"
    $env:APPDATA = $ConfigRoot
    $State = Join-Path $ConfigRoot "Maakdown/state.json"
    node (Join-Path $RepoRoot "scripts/write-native-visual-state.mjs") $Theme $State

    $Process = Start-Process -FilePath $App -ArgumentList "`"$Fixture`"" -PassThru
    try {
        $Deadline = (Get-Date).AddSeconds(20)
        do {
            Start-Sleep -Milliseconds 500
            $Process.Refresh()
        } while ($Process.MainWindowHandle -eq 0 -and (Get-Date) -lt $Deadline)

        if ($Process.MainWindowHandle -eq 0) {
            throw "Maakdown did not expose a native window"
        }

        # Allow code highlighting and Mermaid to finish in the real WebView2.
        Start-Sleep -Seconds 8
        $Rect = New-Object NativeWindow+RECT
        if (-not [NativeWindow]::GetWindowRect($Process.MainWindowHandle, [ref]$Rect)) {
            throw "Could not read the Maakdown window bounds"
        }

        $Width = $Rect.Right - $Rect.Left
        $Height = $Rect.Bottom - $Rect.Top
        $Bitmap = New-Object System.Drawing.Bitmap $Width, $Height
        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
        try {
            $Graphics.CopyFromScreen($Rect.Left, $Rect.Top, 0, 0, $Bitmap.Size)
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
        Remove-Item -Recurse -Force $ConfigRoot -ErrorAction SilentlyContinue
    }
}

