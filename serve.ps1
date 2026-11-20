# 气脉陪练 Demo · Windows 内置静态服务器（无需安装 Python）
# 由「启动-Demo-Windows.bat」调用；也可手动右键用 PowerShell 运行
$ErrorActionPreference = 'SilentlyContinue'

$root = $PSScriptRoot
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

# 自动挑选一个空闲端口（从 8848 开始，被占用就依次尝试）
$port = 0
foreach ($candidate in @(8848, 8899, 8900, 8910, 8920)) {
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
  Write-Host "找不到可用端口（8848/8899/8900/8910/8920 都被占用）。"
  Start-Sleep -Seconds 5
  exit 1
}

$types = @{
  '.html'='text/html; charset=utf-8'
  '.js'='application/javascript; charset=utf-8'
  '.mjs'='application/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'
  '.wasm'='application/wasm'
  '.wav'='audio/wav'
  '.png'='image/png'
  '.jpg'='image/jpeg'
  '.jpeg'='image/jpeg'
  '.gif'='image/gif'
  '.task'='application/octet-stream'
  '.data'='application/octet-stream'
  '.json'='application/json'
  '.ico'='image/x-icon'
}

try {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$port/")
  $listener.Start()
} catch {
  Write-Host "端口 $port 启动失败。请关闭占用该端口的程序后重试。"
  Write-Host $_.Exception.Message
  Start-Sleep -Seconds 5
  exit 1
}

Write-Host "✅ 服务器已就绪：http://localhost:$port"
Start-Process "http://localhost:$port"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ($rel -eq '') { $rel = 'index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      # 防目录穿越
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
