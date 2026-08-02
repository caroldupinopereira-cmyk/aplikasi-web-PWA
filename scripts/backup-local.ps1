param(
  [string]$BackupRoot = "backups"
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
$backupRootPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $BackupRoot))
if (-not $backupRootPath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Folder backup harus berada di dalam folder proyek."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupRootPath "local-$timestamp"
$databasePath = Join-Path $backupPath "database.sql"
$migrationPath = Join-Path $backupPath "drizzle"
$r2Source = Join-Path $projectRoot ".wrangler\state\v3\r2"
$r2Target = Join-Path $backupPath "r2-state"

New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

Push-Location $projectRoot
try {
  & npx wrangler d1 export site-creator-d1 --local --config wrangler.local.jsonc --output $databasePath --skip-confirmation
  if ($LASTEXITCODE -ne 0) {
    throw "Export database D1 lokal gagal."
  }
  Copy-Item -LiteralPath (Join-Path $projectRoot "drizzle") -Destination $migrationPath -Recurse
  if (Test-Path -LiteralPath $r2Source) {
    Copy-Item -LiteralPath $r2Source -Destination $r2Target -Recurse
  }

  $databaseHash = Get-Sha256 $databasePath
  $manifest = [ordered]@{
    formatVersion = 1
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    scope = "local-only"
    databaseFile = "database.sql"
    databaseSha256 = $databaseHash
    migrationsFolder = "drizzle"
    r2StateIncluded = (Test-Path -LiteralPath $r2Target)
    warning = "Backup ini dapat berisi data sensitif. Jangan commit atau bagikan."
  }
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupPath "manifest.json") -Encoding UTF8
} finally {
  Pop-Location
}

Write-Host "Backup lokal berhasil dibuat:"
Write-Host $backupPath
