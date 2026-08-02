param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [Parameter(Mandatory = $true)]
  [string]$Confirmation
)

$ErrorActionPreference = "Stop"
if ($Confirmation -ne "PULIHKAN-DATABASE-LOKAL") {
  throw "Frasa konfirmasi salah. Pemulihan dibatalkan."
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "backups"))
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if (-not $resolvedBackup.StartsWith($backupRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Backup harus berada di dalam folder backups proyek."
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "verify-backup.ps1") -BackupPath $resolvedBackup
if ($LASTEXITCODE -ne 0) {
  throw "Verifikasi backup gagal. Pemulihan dibatalkan."
}

$manifest = Get-Content -LiteralPath (Join-Path $resolvedBackup "manifest.json") -Raw | ConvertFrom-Json
$databaseFile = Join-Path $resolvedBackup $manifest.databaseFile
$d1State = Join-Path $projectRoot ".wrangler\state\v3\d1"
$r2State = Join-Path $projectRoot ".wrangler\state\v3\r2"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safetyPath = Join-Path $backupRoot "pre-restore-$timestamp"
New-Item -ItemType Directory -Path $safetyPath -Force | Out-Null

Write-Host "Pastikan npm run dev sudah dihentikan."
if (Test-Path -LiteralPath $d1State) {
  Move-Item -LiteralPath $d1State -Destination (Join-Path $safetyPath "d1-state")
}
if (Test-Path -LiteralPath $r2State) {
  Move-Item -LiteralPath $r2State -Destination (Join-Path $safetyPath "r2-state")
}

Push-Location $projectRoot
try {
  & npx wrangler d1 execute site-creator-d1 --local --config wrangler.local.jsonc --file $databaseFile
  if ($LASTEXITCODE -ne 0) {
    throw "Import database gagal. State lama tersimpan di $safetyPath."
  }
  $backupR2 = Join-Path $resolvedBackup "r2-state"
  if ($manifest.r2StateIncluded -and (Test-Path -LiteralPath $backupR2)) {
    $r2Parent = Split-Path -Parent $r2State
    New-Item -ItemType Directory -Path $r2Parent -Force | Out-Null
    Copy-Item -LiteralPath $backupR2 -Destination $r2State -Recurse
  }
} finally {
  Pop-Location
}

Write-Host "Pemulihan lokal selesai."
Write-Host "State sebelum pemulihan disimpan di:" $safetyPath
