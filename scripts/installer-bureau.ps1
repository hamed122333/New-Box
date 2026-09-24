# ---------------------------------------------------------------------------
# New Box - installe (ou met a jour) la version locale du site et la lance
#
# Sur le Bureau (dossier NewBox-3D), en une ligne :
#   irm https://raw.githubusercontent.com/hamed122333/New-Box/claude/charming-maxwell-jjq9yf/scripts/installer-bureau.ps1 | iex
#
# Dans un autre dossier (ex. C:\Users\hamed\work\NewBox-3D) :
#   $env:NEWBOX_DIR = 'C:\Users\hamed\work\NewBox-3D'; irm https://raw.githubusercontent.com/hamed122333/New-Box/claude/charming-maxwell-jjq9yf/scripts/installer-bureau.ps1 | iex
#
# Prepare aussi l'environnement : si Git ou Node.js manquent (ou si Node est trop ancien),
# le script propose de les installer avec winget. NEWBOX_YES=1 accepte sans poser la question.
#
# Notes :
#  - fichier volontairement en ASCII, sans BOM : compatible "irm | iex" et Windows PowerShell 5.1 ;
#  - npm est appele via npm.cmd : fonctionne meme si l'execution des scripts .ps1 est desactivee
#    (politique d'execution "Restricted" par defaut sur Windows).
# ---------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'

$Repo   = 'https://github.com/hamed122333/New-Box.git'
$Branch = 'claude/charming-maxwell-jjq9yf'
$Name   = 'NewBox-3D'

# Executables uniquement (npm.cmd plutot que npm.ps1)
function Find-Exe([string]$name) {
  $cmd = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { return $cmd.Source }
  return $null
}

# Vite 8 demande Node 20.19+ ou 22.12+
function Test-NodeVersion([string]$node) {
  $ver = (& $node -p 'process.versions.node').Trim()
  $maj, $min = $ver.Split('.')[0..1] | ForEach-Object { [int]$_ }
  $ok = ($maj -eq 20 -and $min -ge 19) -or ($maj -eq 22 -and $min -ge 12) -or ($maj -ge 23)
  return @{ Ok = $ok; Version = $ver }
}

function Update-SessionPath {
  if ($PSVersionTable.PSEdition -eq 'Desktop' -or $IsWindows) {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  }
}

# Installation d'un outil manquant avec winget (sur accord de l'utilisateur)
function Install-Tool([string]$id, [string]$label) {
  $winget = Find-Exe 'winget'
  if (-not $winget) { return $false }
  if ($env:NEWBOX_YES -ne '1') {
    $answer = Read-Host "$label est absent ou trop ancien. L'installer maintenant avec winget ? (O/N)"
    if ($answer -notmatch '^[oOyY]') { return $false }
  }
  Write-Host "> Installation de $label (winget)" -ForegroundColor Cyan
  & $winget install --id $id --exact --source winget --accept-package-agreements --accept-source-agreements
  Update-SessionPath
  return $true
}

function Invoke-Step([string]$label, [scriptblock]$block) {
  Write-Host "> $label" -ForegroundColor Cyan
  & $block
  if ($LASTEXITCODE -ne 0) { throw "Echec : $label (code $LASTEXITCODE)." }
}

# --- 1. Environnement ------------------------------------------------------
Write-Host '> Verification de l''environnement' -ForegroundColor Cyan

$git = Find-Exe 'git'
if (-not $git -and (Install-Tool 'Git.Git' 'Git')) { $git = Find-Exe 'git' }
if (-not $git) {
  throw 'Git est introuvable. Installez-le (winget install --id Git.Git -e, ou https://git-scm.com), fermez puis rouvrez PowerShell et relancez.'
}

$node = Find-Exe 'node'
if (-not $node -or -not (Test-NodeVersion $node).Ok) {
  if (Install-Tool 'OpenJS.NodeJS.LTS' 'Node.js LTS') { $node = Find-Exe 'node' }
}
if (-not $node) {
  throw 'Node.js est introuvable. Installez Node.js LTS (winget install --id OpenJS.NodeJS.LTS -e, ou https://nodejs.org), fermez puis rouvrez PowerShell et relancez.'
}
$nodeInfo = Test-NodeVersion $node
if (-not $nodeInfo.Ok) {
  throw "Node.js $($nodeInfo.Version) est trop ancien (20.19+ ou 22.12+ requis) : installez Node.js LTS puis relancez."
}
$npm = Find-Exe 'npm'
if (-not $npm) { throw 'npm est introuvable : reinstallez Node.js LTS (https://nodejs.org).' }
Write-Host "  Git   : $((& $git --version).Trim())"
Write-Host "  Node  : v$($nodeInfo.Version)"
Write-Host "  npm   : $((& $npm --version).Trim())"

# --- 2. Dossier ------------------------------------------------------------
if ($env:NEWBOX_DIR) {
  $Target = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($env:NEWBOX_DIR)
} else {
  # Gere aussi le Bureau redirige vers OneDrive
  $Target = Join-Path ([Environment]::GetFolderPath('Desktop')) $Name
}

if (Test-Path (Join-Path $Target '.git')) {
  Invoke-Step "Mise a jour de $Target" { & $git -C $Target fetch origin $Branch }
  # package-lock.json est regenere par npm : on l'aligne sur le depot avant de mettre a jour
  Invoke-Step 'Nettoyage du fichier de verrouillage' { & $git -C $Target checkout -- package-lock.json }
  Invoke-Step 'Selection de la branche' { & $git -C $Target checkout $Branch }
  Invoke-Step 'Recuperation des changements' { & $git -C $Target pull --ff-only origin $Branch }
} else {
  if ((Test-Path $Target) -and (Get-ChildItem -Force $Target | Select-Object -First 1)) {
    throw "Le dossier $Target existe deja et n'est pas vide : choisissez un autre dossier (NEWBOX_DIR) ou videz-le."
  }
  $parent = Split-Path -Parent $Target
  if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  Invoke-Step "Clonage dans $Target" { & $git clone --branch $Branch $Repo $Target }
}

# --- 3. Dependances et lancement ------------------------------------------
Set-Location $Target
Invoke-Step 'Installation des dependances (npm install)' { & $npm install --no-fund --no-audit }

Write-Host ''
Write-Host "Pret ! Dossier : $Target" -ForegroundColor Green
Write-Host '  Pour relancer plus tard : double-clic sur demarrer.bat dans ce dossier.'
Write-Host '  Le site s''ouvre sur http://localhost:5173  (Ctrl+C pour arreter)'
& $npm start
