Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$size,
        [string]$path
    )
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.Color]::FromArgb(0, 161, 214),
        [System.Drawing.Color]::FromArgb(0, 181, 226)
    )
    
    $g.FillEllipse($brush, 0, 0, $size, $size)
    
    $fontSize = [int]($size * 0.5)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $sf.LineAlignment = 'Center'
    
    $g.DrawString('B', $font, [System.Drawing.Brushes]::White, ($size/2), ($size/2 + 1), $sf)
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Created: $path"
}

$iconsDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

Create-Icon -size 16 -path (Join-Path $iconsDir "icon16.png")
Create-Icon -size 48 -path (Join-Path $iconsDir "icon48.png")
Create-Icon -size 128 -path (Join-Path $iconsDir "icon128.png")

Write-Host "All icons created successfully!"
