param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = "Stop"
function Get-Sha256([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace("-", "")
    } finally {
      $sha.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "backups"))
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if (-not $resolvedBackup.StartsWith($backupRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Backup harus berada di dalam folder backups proyek."
}

$manifestPath = Join-Path $resolvedBackup "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "manifest.json tidak ditemukan."
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$databasePath = Join-Path $resolvedBackup $manifest.databaseFile
if (-not (Test-Path -LiteralPath $databasePath)) {
  throw "File database backup tidak ditemukan."
}
$actualHash = Get-Sha256 $databasePath
if ($actualHash -ne $manifest.databaseSha256) {
  throw "Checksum database berbeda. Backup mungkin rusak atau berubah."
}

Write-Host "Backup valid."
Write-Host "Dibuat:" $manifest.createdAt
Write-Host "R2 disertakan:" $manifest.r2StateIncluded
