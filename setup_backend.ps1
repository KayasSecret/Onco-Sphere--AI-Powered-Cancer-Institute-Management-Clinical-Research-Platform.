$base = "C:\Users\Kayas\.gemini\antigravity\scratch\helix\helix-backend"
$pkgDirs = @("app","app\config","app\database","app\middleware","app\models","app\routes","app\schemas","app\services","app\utils")
foreach ($d in $pkgDirs) {
  $full = Join-Path $base $d
  New-Item -ItemType Directory -Force -Path $full | Out-Null
  $init = Join-Path $full "__init__.py"
  if (-not (Test-Path $init)) {
    [System.IO.File]::WriteAllText($init, "")
  }
}
Write-Host "Backend package structure ready."
