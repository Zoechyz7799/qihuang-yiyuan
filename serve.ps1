# Qi-Pulse interactive lesson - Windows built-in static server.
# Launched by "Start-Interactive-Windows.bat". No Python or Node required.
# All-ASCII on purpose: safe with Windows PowerShell 5.1 and non-ASCII folders.

$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

$port = 0
foreach ($candidate in @(4719, 4720, 4721, 4722, 4723, 4724, 4725, 4726)) {
  $probe = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, $candidate)
  try {
    $probe.Start()
    $probe.Stop()
    $port = $candidate
    break
  } catch {
    continue
  }
}
if ($port -eq 0) {
  Write-Host "No free port found (4719-4726). Close other local servers and retry."
  Start-Sleep -Seconds 5
  exit 1
}

$types = @{
  '.html'  = 'text/html; charset=utf-8'
  '.htm'   = 'text/html; charset=utf-8'
  '.js'    = 'application/javascript; charset=utf-8'
  '.mjs'   = 'application/javascript; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.txt'   = 'text/plain; charset=utf-8'
  '.wasm'  = 'application/wasm'
  '.task'  = 'application/octet-stream'
  '.data'  = 'application/octet-stream'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.gif'   = 'image/gif'
  '.webp'  = 'image/webp'
  '.svg'   = 'image/svg+xml'
  '.ico'   = 'image/x-icon'
  '.woff'  = 'font/woff'
  '.woff2' = 'font/woff2'
  '.wav'   = 'audio/wav'
}

try {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$port/")
  $listener.Start()
} catch {
  Write-Host "Failed to start on port $port. Close the program using that port and retry."
  Write-Host $_.Exception.Message
  Start-Sleep -Seconds 5
  exit 1
}

Write-Host "=============================================="
Write-Host " Qi-Pulse / interactive lesson"
Write-Host "=============================================="
Write-Host "OK  Server ready: http://localhost:$port/practice.html"
Write-Host "    Pet page    : http://localhost:$port/"
Write-Host ""
Write-Host "IMPORTANT: keep this window open while practising."
Write-Host "Closing it stops the server (browser shows ERR_CONNECTION_REFUSED)."
Write-Host ""
Start-Process "http://localhost:$port/practice.html"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ($rel -eq '') { $rel = 'index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      if (-not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
      } elseif (Test-Path $full -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = $types[$ext]
        if (-not $ct) { $ct = 'application/octet-stream' }
        $res.ContentType = $ct
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
