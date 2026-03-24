#!/usr/bin/env bash
set -euo pipefail

# ===================================================================
# setup.sh — One-command setup for the MP3 Extractor
# ===================================================================
#
# This script installs everything you need:
#   - yt-dlp (in a safe user-level virtualenv)
#   - Node.js dependencies
#   - Builds the backend and browser extension
#   - Sets up the backend to run automatically
#   - Configures the browser extension for auto-launch
#
# Usage:
#   ./setup.sh              (first run — installs everything)
#   ./setup.sh <ext-id>     (after loading the extension in your browser)
#
# ===================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
YT_DLP_VENV="$HOME/.local/share/mp3/yt-dlp-venv"
HOST_NAME="com.mp3.extractor"
HOST_SCRIPT="$PROJECT_DIR/scripts/native-host.js"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${BLUE}${BOLD}[$1/$TOTAL_STEPS]${NC} $2"; }
ok()   { echo -e "    ${GREEN}Done.${NC}"; }
warn() { echo -e "    ${YELLOW}$1${NC}"; }
fail() { echo -e "    ${RED}$1${NC}"; exit 1; }

# ---------------------------------------------------------------
# Phase 1: Install everything (no extension ID needed)
# ---------------------------------------------------------------

install_all() {
  TOTAL_STEPS=5

  echo -e "${BOLD}"
  echo "  MP3 Extractor — Setup"
  echo -e "${NC}"

  # --- Check prerequisites ---
  step 1 "Checking prerequisites..."

  if ! command -v node &>/dev/null; then
    fail "Node.js is not installed. Install it from https://nodejs.org (v18+)"
  fi
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    fail "Node.js v18+ required (you have $(node -v))"
  fi
  echo "    Node.js $(node -v)"

  if ! command -v npm &>/dev/null; then
    fail "npm is not installed."
  fi
  echo "    npm $(npm -v)"

  if ! command -v python3 &>/dev/null; then
    fail "Python 3 is not installed. Install it with: sudo apt install python3 python3-venv"
  fi
  echo "    Python $(python3 --version | cut -d' ' -f2)"

  if command -v ffmpeg &>/dev/null; then
    echo "    ffmpeg found at $(which ffmpeg)"
  else
    fail "ffmpeg is not installed. Install it with: sudo apt install ffmpeg"
  fi
  ok

  # --- Install yt-dlp ---
  step 2 "Installing yt-dlp..."

  if [ -f "$YT_DLP_VENV/bin/yt-dlp" ]; then
    echo "    Already installed at $YT_DLP_VENV/bin/yt-dlp"
    echo "    Updating to latest version..."
    "$YT_DLP_VENV/bin/pip" install --upgrade yt-dlp --quiet
  else
    echo "    Creating virtualenv at $YT_DLP_VENV..."
    mkdir -p "$(dirname "$YT_DLP_VENV")"
    python3 -m venv "$YT_DLP_VENV"
    "$YT_DLP_VENV/bin/pip" install --upgrade pip --quiet
    "$YT_DLP_VENV/bin/pip" install yt-dlp --quiet
  fi
  echo "    yt-dlp $("$YT_DLP_VENV/bin/yt-dlp" --version)"
  ok

  # --- Install Node dependencies & build backend ---
  step 3 "Building the backend..."

  cd "$PROJECT_DIR"
  npm install --silent 2>/dev/null
  npm run build 2>&1 | tail -1
  ok

  # --- Build the browser extension ---
  step 4 "Building the browser extension..."

  cd "$PROJECT_DIR/chrome-extension"
  npm install --silent 2>/dev/null
  npm run build 2>&1 | tail -1
  ok

  # --- Set up systemd service ---
  step 5 "Setting up auto-start service..."

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
  systemctl --user start mp3 2>/dev/null || true
  ok

  # --- Done with Phase 1 ---
  echo ""
  echo -e "${GREEN}${BOLD}========================================${NC}"
  echo -e "${GREEN}${BOLD}  Build complete!${NC}"
  echo -e "${GREEN}${BOLD}========================================${NC}"
  echo ""
  echo -e "  ${BOLD}Next step: load the extension in your browser${NC}"
  echo ""
  echo "  1. Open your browser's extensions page:"
  echo -e "     Chrome: ${BOLD}chrome://extensions${NC}"
  echo -e "     Brave:  ${BOLD}brave://extensions${NC}"
  echo ""
  echo -e "  2. Turn on ${BOLD}Developer mode${NC} (top-right toggle)"
  echo ""
  echo -e "  3. Click ${BOLD}Load unpacked${NC}"
  echo ""
  echo "  4. Select this folder:"
  echo -e "     ${BOLD}$PROJECT_DIR/chrome-extension/dist/${NC}"
  echo ""
  echo -e "  5. Copy the ${BOLD}extension ID${NC} shown under the extension name"
  echo "     (it looks like: abcdefghijklmnopqrstuvwxyzabcdef)"
  echo ""
  echo "  6. Come back here and run:"
  echo -e "     ${BOLD}./setup.sh <paste-extension-id-here>${NC}"
  echo ""
}

# ---------------------------------------------------------------
# Phase 2: Connect the extension (needs extension ID)
# ---------------------------------------------------------------

connect_extension() {
  local EXT_ID="$1"
  TOTAL_STEPS=2

  # Validate extension ID format
  if ! echo "$EXT_ID" | grep -qE '^[a-z]{32}$'; then
    echo -e "${RED}Error: Extension ID should be 32 lowercase letters.${NC}"
    echo "Got: $EXT_ID"
    echo ""
    echo "You can find it on chrome://extensions or brave://extensions"
    echo "under the extension name after loading it."
    exit 1
  fi

  echo -e "${BOLD}"
  echo "  MP3 Extractor — Connecting Extension"
  echo -e "${NC}"

  # --- Make native host executable ---
  chmod +x "$HOST_SCRIPT"

  # --- Install native messaging manifest ---
  step 1 "Registering native messaging host..."

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

  for BROWSER_DIR in \
    "$HOME/.config/google-chrome/NativeMessagingHosts" \
    "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts" \
    "$HOME/.config/chromium/NativeMessagingHosts"; do

    mkdir -p "$BROWSER_DIR"
    echo "$MANIFEST_JSON" > "$BROWSER_DIR/$HOST_NAME.json"
  done
  echo "    Registered for Chrome, Brave, and Chromium"
  ok

  # --- Verify backend is running ---
  step 2 "Verifying backend is running..."

  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -qE '(200|404)'; then
    echo "    Backend is running on http://localhost:3000"
  else
    echo "    Starting backend..."
    systemctl --user start mp3 2>/dev/null || true
    sleep 3
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "    Backend is running on http://localhost:3000"
    else
      warn "Backend might still be starting. Give it a few more seconds."
    fi
  fi
  ok

  echo ""
  echo -e "${GREEN}${BOLD}========================================${NC}"
  echo -e "${GREEN}${BOLD}  Setup complete! You're ready to go.${NC}"
  echo -e "${GREEN}${BOLD}========================================${NC}"
  echo ""
  echo "  How to use:"
  echo ""
  echo "  1. Click the MP3 Extractor icon in your browser toolbar"
  echo "  2. Paste a video URL (YouTube, TikTok, Vimeo, etc.)"
  echo "  3. Click Extract Audio"
  echo "  4. Your MP3 downloads automatically"
  echo ""
  echo "  You can also right-click any video link and"
  echo "  select \"Extract Audio\" from the menu."
  echo ""
  echo "  The backend runs automatically in the background."
  echo "  No terminal needed. Enjoy!"
  echo ""
}

# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

if [ $# -ge 1 ]; then
  connect_extension "$1"
else
  install_all
fi
