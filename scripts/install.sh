#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------
# install.sh — Set up the mp3 extractor backend + native messaging
# ---------------------------------------------------------------
#
# Usage:
#   ./scripts/install.sh <extension-id>
#
# The extension ID is shown on chrome://extensions or brave://extensions
# after you load the unpacked extension.
# ---------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST_NAME="com.mp3.extractor"
HOST_SCRIPT="$SCRIPT_DIR/native-host.js"

# --- Parse extension ID ---

if [ $# -lt 1 ]; then
  echo ""
  echo "Usage: $0 <extension-id>"
  echo ""
  echo "Steps:"
  echo "  1. Build the extension:  cd chrome-extension && npm run build"
  echo "  2. Load it in Chrome/Brave as an unpacked extension (chrome://extensions)"
  echo "  3. Copy the extension ID from the extensions page"
  echo "  4. Run:  $0 <extension-id>"
  echo ""
  exit 1
fi

EXT_ID="$1"

# Validate extension ID format (32 lowercase letters)
if ! echo "$EXT_ID" | grep -qE '^[a-z]{32}$'; then
  echo "Error: Extension ID should be 32 lowercase letters."
  echo "Got: $EXT_ID"
  exit 1
fi

echo "Project directory: $PROJECT_DIR"
echo "Extension ID:      $EXT_ID"
echo ""

# --- 1. Build the Next.js app for production ---

echo "[1/4] Building Next.js app..."
cd "$PROJECT_DIR"
npm install --silent
npm run build
echo "      Done."
echo ""

# --- 2. Build the extension ---

echo "[2/4] Building browser extension..."
cd "$PROJECT_DIR/chrome-extension"
npm install --silent
npm run build
echo "      Done."
echo ""

# --- 3. Make native host script executable ---

chmod +x "$HOST_SCRIPT"

# --- 4. Install native messaging manifest ---

echo "[3/4] Installing native messaging host..."

MANIFEST_JSON=$(cat <<MANIFEST
{
  "name": "$HOST_NAME",
  "description": "MP3 Extractor backend launcher",
  "path": "$HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
MANIFEST
)

# Install for all supported Chromium browsers
INSTALLED=0

for BROWSER_DIR in \
  "$HOME/.config/google-chrome/NativeMessagingHosts" \
  "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts" \
  "$HOME/.config/chromium/NativeMessagingHosts"; do

  mkdir -p "$BROWSER_DIR"
  echo "$MANIFEST_JSON" > "$BROWSER_DIR/$HOST_NAME.json"
  echo "      Installed: $BROWSER_DIR/$HOST_NAME.json"
  INSTALLED=$((INSTALLED + 1))
done

echo ""

# --- 4. Set up systemd user service (optional auto-start) ---

echo "[4/4] Setting up systemd user service (auto-start on login)..."

SYSTEMD_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_DIR"

cat > "$SYSTEMD_DIR/mp3.service" <<SERVICE
[Unit]
Description=mp3 audio extractor backend

[Service]
WorkingDirectory=$PROJECT_DIR
ExecStart=$(which npm) start
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=default.target
SERVICE

systemctl --user daemon-reload
systemctl --user enable mp3 2>/dev/null || true
echo "      Service installed (mp3.service)."
echo "      It will auto-start on login, or you can start it now:"
echo "        systemctl --user start mp3"
echo ""

# --- Done ---

echo "============================================"
echo " Setup complete!"
echo "============================================"
echo ""
echo "How to use:"
echo ""
echo "  Option A — Auto-start (recommended):"
echo "    The backend auto-starts when you log in."
echo "    Run once now:  systemctl --user start mp3"
echo ""
echo "  Option B — On-demand via extension:"
echo "    The extension will auto-launch the backend"
echo "    when you extract audio (via native messaging)."
echo ""
echo "Load the extension from:"
echo "  Chrome: chrome://extensions  ->  Load unpacked  ->  $PROJECT_DIR/chrome-extension/dist/"
echo "  Brave:  brave://extensions   ->  Load unpacked  ->  $PROJECT_DIR/chrome-extension/dist/"
echo ""
