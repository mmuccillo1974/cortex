$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8791
$pythonCandidates = @(
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
  "python",
  "py"
)

$python = $null
foreach ($candidate in $pythonCandidates) {
  try {
    if ($candidate -eq "python" -or $candidate -eq "py" -or (Test-Path -LiteralPath $candidate)) {
      $python = $candidate
      break
    }
  } catch {}
}

if (-not $python) {
  Start-Process -FilePath (Join-Path $root "index.html")
  exit 0
}

while ($port -lt 8810) {
  $busy = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if (-not $busy) { break }
  $port++
}

$url = "http://127.0.0.1:$port/index.html"
$args = "-m http.server $port --bind 127.0.0.1"

$process = Start-Process -FilePath $python -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 1
Start-Process $url

Write-Host "CORTEX aberto em $url"
Write-Host "Servidor local iniciado. Pode fechar esta janela depois de terminar."
