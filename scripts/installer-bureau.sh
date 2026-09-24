#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# New Box — installe (ou met à jour) la version locale dans un dossier du Bureau
# Usage (macOS / Linux) :  bash installer-bureau.sh
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
TARGET="$DESKTOP/$NAME"

if [ -d "$TARGET/.git" ]; then
  echo "↻ Mise à jour de $TARGET"
  git -C "$TARGET" fetch origin "$BRANCH"
  git -C "$TARGET" checkout "$BRANCH"
  git -C "$TARGET" pull --ff-only origin "$BRANCH"
else
  echo "⬇ Clonage dans $TARGET"
  git clone --branch "$BRANCH" "$REPO" "$TARGET"
fi

cd "$TARGET"
echo "📦 Installation des dépendances…"
npm install

echo
echo "✅ Prêt ! Dossier : $TARGET"
echo "   Lancement du site sur http://localhost:5173  (Ctrl+C pour arrêter)"
npm run dev -- --open
