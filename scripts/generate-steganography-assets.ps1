$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class LsbImageTools
{
    public static void Embed(Bitmap carrier, Bitmap hidden)
    {
        Rectangle rect = new Rectangle(0, 0, carrier.Width, carrier.Height);
        BitmapData carrierData = carrier.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        BitmapData hiddenData = hidden.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);

        try
        {
            int byteCount = carrierData.Stride * carrierData.Height;
            byte[] carrierBytes = new byte[byteCount];
            byte[] hiddenBytes = new byte[byteCount];
            Marshal.Copy(carrierData.Scan0, carrierBytes, 0, byteCount);
            Marshal.Copy(hiddenData.Scan0, hiddenBytes, 0, byteCount);

            for (int y = 0; y < carrier.Height; y++)
            {
                int row = y * carrierData.Stride;
                for (int x = 0; x < carrier.Width; x++)
                {
                    int i = row + x * 4;
                    int luminance = hiddenBytes[i + 2] * 299 + hiddenBytes[i + 1] * 587 + hiddenBytes[i] * 114;
                    byte bit = (byte)(luminance >= 128000 ? 1 : 0);

                    carrierBytes[i] = (byte)((carrierBytes[i] & 0xFE) | bit);
                    carrierBytes[i + 1] = (byte)((carrierBytes[i + 1] & 0xFE) | bit);
                    carrierBytes[i + 2] = (byte)((carrierBytes[i + 2] & 0xFE) | bit);
                    carrierBytes[i + 3] = 255;
                }
            }

            Marshal.Copy(carrierBytes, 0, carrierData.Scan0, byteCount);
        }
        finally
        {
            carrier.UnlockBits(carrierData);
            hidden.UnlockBits(hiddenData);
        }
    }

    public static Bitmap Reveal(Bitmap carrier)
    {
        Rectangle rect = new Rectangle(0, 0, carrier.Width, carrier.Height);
        Bitmap revealed = new Bitmap(carrier.Width, carrier.Height, PixelFormat.Format32bppArgb);
        BitmapData carrierData = carrier.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        BitmapData revealedData = revealed.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

        try
        {
            int byteCount = carrierData.Stride * carrierData.Height;
            byte[] carrierBytes = new byte[byteCount];
            byte[] revealedBytes = new byte[byteCount];
            Marshal.Copy(carrierData.Scan0, carrierBytes, 0, byteCount);

            for (int y = 0; y < carrier.Height; y++)
            {
                int row = y * carrierData.Stride;
                for (int x = 0; x < carrier.Width; x++)
                {
                    int i = row + x * 4;
                    byte value = (carrierBytes[i + 2] & 1) == 1 ? (byte)255 : (byte)0;

                    revealedBytes[i] = value;
                    revealedBytes[i + 1] = value;
                    revealedBytes[i + 2] = value;
                    revealedBytes[i + 3] = 255;
                }
            }

            Marshal.Copy(revealedBytes, 0, revealedData.Scan0, byteCount);
            return revealed;
        }
        finally
        {
            carrier.UnlockBits(carrierData);
            revealed.UnlockBits(revealedData);
        }
    }
}
"@

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$postDir = Join-Path $root 'src\content\posts\02-steganography'
$assetsDir = Join-Path $postDir 'assets'
$sourcePath = Join-Path $root 'public\freiburg-colmar-strassburg-munich\big-16.jpg'

New-Item -ItemType Directory -Force -Path $postDir | Out-Null
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

function New-CroppedBitmap {
  param(
    [System.Drawing.Image] $Source,
    [int] $Width,
    [int] $Height
  )

  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $sourceAspect = $Source.Width / $Source.Height
  $targetAspect = $Width / $Height

  if ($sourceAspect -gt $targetAspect) {
    $cropHeight = [double] $Source.Height
    $cropWidth = $cropHeight * $targetAspect
    $cropX = ($Source.Width - $cropWidth) / 2
    $cropY = 0
  } else {
    $cropWidth = [double] $Source.Width
    $cropHeight = $cropWidth / $targetAspect
    $cropX = 0
    $cropY = ($Source.Height - $cropHeight) / 2
  }

  $destination = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
  $sourceRectangle = New-Object System.Drawing.Rectangle ([int] [Math]::Round($cropX)), ([int] [Math]::Round($cropY)), ([int] [Math]::Round($cropWidth)), ([int] [Math]::Round($cropHeight))
  $graphics.DrawImage($Source, $destination, $sourceRectangle, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()

  return $bitmap
}

function New-HiddenBitmap {
  param(
    [int] $Width,
    [int] $Height
  )

  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Black)

  $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $blackBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
  $softPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 10
  $thinPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 4
  $font = New-Object System.Drawing.Font 'Segoe UI', 50, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $smallFont = New-Object System.Drawing.Font 'Segoe UI', 22, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center

  $graphics.FillEllipse($whiteBrush, 560, 54, 124, 124)
  $graphics.FillEllipse($blackBrush, 600, 42, 124, 124)

  $graphics.DrawEllipse($softPen, 226, 210, 96, 96)
  $graphics.DrawLine($softPen, 322, 258, 574, 258)
  $graphics.DrawLine($softPen, 524, 258, 524, 314)
  $graphics.DrawLine($softPen, 574, 258, 574, 304)
  $graphics.DrawLine($thinPen, 226, 344, 574, 344)

  $graphics.FillRectangle($whiteBrush, 198, 352, 32, 32)
  $graphics.FillRectangle($whiteBrush, 258, 352, 32, 32)
  $graphics.FillRectangle($whiteBrush, 318, 352, 32, 32)
  $graphics.FillRectangle($whiteBrush, 378, 352, 32, 32)
  $graphics.FillRectangle($whiteBrush, 438, 352, 32, 32)
  $graphics.FillRectangle($whiteBrush, 498, 352, 32, 32)
  $graphics.FillRectangle($whiteBrush, 558, 352, 32, 32)

  $graphics.DrawString('LSB', $font, $whiteBrush, (New-Object System.Drawing.RectangleF 0, 132, $Width, 72), $format)
  $graphics.DrawString('the quiet layer', $smallFont, $whiteBrush, (New-Object System.Drawing.RectangleF 0, 386, $Width, 40), $format)

  $format.Dispose()
  $font.Dispose()
  $smallFont.Dispose()
  $thinPen.Dispose()
  $softPen.Dispose()
  $blackBrush.Dispose()
  $whiteBrush.Dispose()
  $graphics.Dispose()

  return $bitmap
}

function Save-Jpeg {
  param(
    [System.Drawing.Bitmap] $Bitmap,
    [string] $Path,
    [long] $Quality = 86
  )

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' } |
    Select-Object -First 1
  $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $Quality

  try {
    $Bitmap.Save($Path, $codec, $encoderParameters)
  }
  finally {
    $encoderParameters.Dispose()
  }
}

$source = [System.Drawing.Image]::FromFile($sourcePath)

try {
  $carrier = New-CroppedBitmap -Source $source -Width 800 -Height 450
  $hidden = New-HiddenBitmap -Width 800 -Height 450

  [LsbImageTools]::Embed($carrier, $hidden)
  $revealed = [LsbImageTools]::Reveal($carrier)

  $carrier.Save((Join-Path $assetsDir 'carrier-lsb.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $hidden.Save((Join-Path $assetsDir 'hidden-source.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $revealed.Save((Join-Path $assetsDir 'hidden-revealed.png'), [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  if ($revealed) { $revealed.Dispose() }
  if ($hidden) { $hidden.Dispose() }
  if ($carrier) { $carrier.Dispose() }
  $source.Dispose()
}
