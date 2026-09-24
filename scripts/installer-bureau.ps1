# ---------------------------------------------------------------------------
# New Box — installe (ou met à jour) la version locale dans un dossier du Bureau
# Usage (PowerShell) :  powershell -ExecutionPolicy Bypass -File installer-bureau.ps1
# ---------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'

$Repo   = 'https://github.com/hamed122333/New-Box.git'
$Branch = 'claude/charming-maxwell-jjq9yf'
$Name   = 'NewBox-3D'

foreach ($cmd in 'git', 'node', 'npm') {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "❌ '$cmd' est introuvable. Installez Git (https://git-scm.com) et Node.js 20.19+ (https://nodejs.org)." -ForegroundColor Red
    exit 1
  }
}

# Gère aussi le Bureau redirigé vers OneDrive
$Desktop = [Environment]::GetFolderPath('Desktop')
$Target  = Join-Path $Desktop $Name

if (Test-Path (Join-Path $Target '.git')) {
  Write-Host "↻ Mise à jour de $Target"
  git -C $Target fetch origin $Branch
  git -C $Target checkout $Branch
  git -C $Target pull --ff-only origin $Branch
} else {
  Write-Host "⬇ Clonage dans $Target"
  git clone --branch $Branch $Repo $Target
}

Set-Location $Target
Write-Host '📦 Installation des dépendances…'
npm install

Write-Host ''
Write-Host "✅ Prêt ! Dossier : $Target" -ForegroundColor Green
Write-Host '   Lancement du site sur http://localhost:5173  (Ctrl+C pour arrêter)'
npm run dev -- --open
