param(
  [string]$OutPath = "D:\Local AI Coding IDE\frontend\build\icon.png",
  [int]$Size = 256
)

Add-Type -AssemblyName System.Drawing

$dir = Split-Path -Parent $OutPath
if (-not (Test-Path -LiteralPath $dir)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap($Size, $Size)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# ---- Rounded-square background -------------------------------------------
$pad   = [int]($Size * 0.045)
$side  = $Size - 2 * $pad
$radius = [int]($Size * 0.22)

$bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$bgPath.AddArc($pad, $pad, $radius, $radius, 180, 90)
$bgPath.AddArc($pad + $side - $radius, $pad, $radius, $radius, 270, 90)
$bgPath.AddArc($pad + $side - $radius, $pad + $side - $radius, $radius, $radius, 0, 90)
$bgPath.AddArc($pad, $pad + $side - $radius, $radius, $radius, 90, 90)
$bgPath.CloseFigure()

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(0, 0)),
  (New-Object System.Drawing.Point($Size, $Size)),
  [System.Drawing.Color]::FromArgb(255, 26, 32, 44),
  [System.Drawing.Color]::FromArgb(255, 13, 17, 23)
)
$g.FillPath($bgBrush, $bgPath)

$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 62, 74, 94)), ([Math]::Max(1.0, $Size * 0.008))
$g.DrawPath($borderPen, $bgPath)

# ---- Forge "F" mark -------------------------------------------------------
$fBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 138, 61))
$g.FillRectangle($fBrush, [int]($Size * 0.28), [int]($Size * 0.24), [int]($Size * 0.145), [int]($Size * 0.52))
$g.FillRectangle($fBrush, [int]($Size * 0.28), [int]($Size * 0.24), [int]($Size * 0.44), [int]($Size * 0.125))
$g.FillRectangle($fBrush, [int]($Size * 0.28), [int]($Size * 0.435), [int]($Size * 0.335), [int]($Size * 0.115))

# ---- AI spark (four-point star) ------------------------------------------
$cx = $Size * 0.745
$cy = $Size * 0.315
$sparkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 122, 200, 255))
$long = $Size * 0.115
$short = $Size * 0.036

$spark = @(
  (New-Object System.Drawing.PointF([float]$cx, [float]($cy - $long))),
  (New-Object System.Drawing.PointF([float]($cx + $short), [float]($cy - $short))),
  (New-Object System.Drawing.PointF([float]($cx + $long), [float]$cy)),
  (New-Object System.Drawing.PointF([float]($cx + $short), [float]($cy + $short))),
  (New-Object System.Drawing.PointF([float]$cx, [float]($cy + $long))),
  (New-Object System.Drawing.PointF([float]($cx - $short), [float]($cy + $short))),
  (New-Object System.Drawing.PointF([float]($cx - $long), [float]$cy)),
  (New-Object System.Drawing.PointF([float]($cx - $short), [float]($cy - $short)))
)
$g.FillPolygon($sparkBrush, [System.Drawing.PointF[]]$spark)

# ---- Baseline rule -------------------------------------------------------
$ruleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 84, 100, 124))
$g.FillRectangle($ruleBrush, [int]($Size * 0.28), [int]($Size * 0.80), [int]($Size * 0.44), [int]($Size * 0.022))

$g.Flush()
$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

$fi = Get-Item -LiteralPath $OutPath
"wrote {0}  {1}x{2}  {3} bytes" -f $fi.FullName, $Size, $Size, $fi.Length
