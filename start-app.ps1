$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = (Get-Command python -ErrorAction Stop).Source
$port = 4173

while (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    $port++
}

$server = Start-Process `
    -FilePath $python `
    -ArgumentList @("-m", "http.server", "$port", "--bind", "127.0.0.1", "--directory", $appRoot) `
    -WorkingDirectory $appRoot `
    -WindowStyle Hidden `
    -PassThru

Start-Sleep -Milliseconds 800
$url = "http://127.0.0.1:$port/"
Start-Process $url

Write-Host ""
Write-Host "CiKe CET-6 frequency app is running at $url"
Write-Host "Press Enter to stop the local server."
[void][System.Console]::ReadLine()

Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
