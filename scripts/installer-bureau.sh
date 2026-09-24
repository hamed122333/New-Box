#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# New Box — installe (ou met à jour) la version locale dans un dossier du Bureau
# Usage (macOS / Linux) :  bash installer-bureau.sh
#   autre dossier : NEWBOX_DIR=~/work/NewBox-3D bash installer-bureau.sh
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="https://github.com/hamed122333/New-Box.git"
BRANCH="claude/charming-maxwell-jjq9yf"
NAME="NewBox-3D"

for cmd in git node npm; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "❌ '$cmd' est introuvable. Installez Git et Node.js 20.19+ (https://nodejs.org)." >&2
    exit 1
  }
done

# Bureau : dossier XDG (Linux, y compris « Bureau » en français), sinon ~/Desktop
DESKTOP="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
if [ -z "$DESKTOP" ] || [ ! -d "$DESKTOP" ]; then
  if [ -d "$HOME/Desktop" ]; then DESKTOP="$HOME/Desktop"
  elif [ -d "$HOME/Bureau" ]; then DESKTOP="$HOME/Bureau"
  else DESKTOP="$HOME/Desktop"; mkdir -p "$DESKTOP"; fi
fi
TARGET="${NEWBOX_DIR:-$DESKTOP/$NAME}"   # NEWBOX_DIR=/chemin/NewBox-3D pour un autre dossier

if [ -d "$TARGET/.git" ]; then
  echo "↻ Mise à jour de $TARGET"
  git -C "$TARGET" fetch origin "$BRANCH"
  # package-lock.json est régénéré par npm : on l'aligne sur le dépôt avant de mettre à jour
  git -C "$TARGET" checkout -- package-lock.json
  git -C "$TARGET" checkout "$BRANCH"
  git -C "$TARGET" pull --ff-only origin "$BRANCH"
else
  if [ -d "$TARGET" ] && [ -n "$(ls -A "$TARGET")" ]; then
    echo "❌ Le dossier $TARGET existe déjà et n'est pas vide : choisissez un autre dossier (NEWBOX_DIR)." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$TARGET")"
  echo "⬇ Clonage dans $TARGET"
  git clone --branch "$BRANCH" "$REPO" "$TARGET"
fi

cd "$TARGET"
echo "📦 Installation des dépendances…"
npm install

echo
echo "✅ Prêt ! Dossier : $TARGET"
echo "   Lancement du site sur http://localhost:5173  (Ctrl+C pour arrêter)"
npm start
