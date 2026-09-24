# ---------------------------------------------------------------------------
# New Box - installe (ou met a jour) la version locale dans un dossier du Bureau
#
# En une ligne (PowerShell, aucun droit administrateur requis) :
#   irm https://raw.githubusercontent.com/hamed122333/New-Box/claude/charming-maxwell-jjq9yf/scripts/installer-bureau.ps1 | iex
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

$git  = Find-Exe 'git'
$node = Find-Exe 'node'
$npm  = Find-Exe 'npm'
if (-not $git)  { throw 'Git est introuvable. Installez-le (https://git-scm.com), fermez puis rouvrez PowerShell et relancez.' }
if (-not $node -or -not $npm) { throw 'Node.js est introuvable. Installez Node.js 22 LTS (https://nodejs.org), fermez puis rouvrez PowerShell et relancez.' }

# Vite 8 demande Node 20.19+ ou 22.12+
$ver = (& $node -p 'process.versions.node').Trim()
$maj, $min = $ver.Split('.')[0..1] | ForEach-Object { [int]$_ }
$ok = ($maj -eq 20 -and $min -ge 19) -or ($maj -eq 22 -and $min -ge 12) -or ($maj -ge 23)
if (-not $ok) { throw "Node.js $ver est trop ancien : installez Node.js 22 LTS (https://nodejs.org) puis relancez." }

function Invoke-Step([string]$label, [scriptblock]$block) {
  Write-Host "> $label" -ForegroundColor Cyan
  & $block
  if ($LASTEXITCODE -ne 0) { throw "Echec : $label (code $LASTEXITCODE)." }
}

# Gere aussi le Bureau redirige vers OneDrive
$Desktop = [Environment]::GetFolderPath('Desktop')
$Target  = Join-Path $Desktop $Name

if (Test-Path (Join-Path $Target '.git')) {
  Invoke-Step "Mise a jour de $Target" { & $git -C $Target fetch origin $Branch }
  Invoke-Step 'Selection de la branche' { & $git -C $Target checkout $Branch }
  Invoke-Step 'Recuperation des changements' { & $git -C $Target pull --ff-only origin $Branch }
} else {
  Invoke-Step "Clonage dans $Target" { & $git clone --branch $Branch $Repo $Target }
}

Set-Location $Target
Invoke-Step 'Installation des dependances (npm install)' { & $npm install --no-fund --no-audit }

Write-Host ''
Write-Host "Pret ! Dossier : $Target" -ForegroundColor Green
Write-Host '  Pour relancer plus tard : double-clic sur demarrer.bat dans ce dossier.'
Write-Host '  Le site s''ouvre sur http://localhost:5173  (Ctrl+C pour arreter)'
& $npm start
