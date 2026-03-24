# mp3

Self-hosted audio extraction from video URLs, powered by your own Next.js backend with `yt-dlp` and `ffmpeg`.

## Ways to use it

### 1. Web app

Open `http://localhost:3000`, paste a video URL, and download the extracted MP3.

### 2. Chrome extension

Install the browser extension to extract audio from any tab — via the popup, right-click context menu, or auto-detected MP3 links. See [chrome-extension/README.md](chrome-extension/README.md) for build and install steps.

### 3. Brave extension

The same extension works in Brave. Load it from `brave://extensions/` instead of `chrome://extensions/`.

All three options use the same self-hosted backend. No third-party APIs, no accounts, no rate limits.

## Requirements

- Node.js 18+
- `ffmpeg` available on the machine
- `yt-dlp` available either:
  - in a dedicated user-level virtualenv, or
  - via the `YT_DLP_BIN` environment variable

## Local setup

### 1. Install app dependencies

```bash
npm install
```

### 2. Install yt-dlp

A user-level Python virtualenv avoids system package conflicts:

```bash
mkdir -p ~/.local/share/mp3
python3 -m venv ~/.local/share/mp3/yt-dlp-venv
. ~/.local/share/mp3/yt-dlp-venv/bin/activate
pip install yt-dlp
```

### 3. Verify binaries

```bash
~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp --version
ffmpeg -version
```

### 4. Optional environment config

```bash
cp .env.example .env.local
```

Available settings:
- `YT_DLP_BIN` — absolute path to `yt-dlp`
- `FFMPEG_BIN` — absolute path to `ffmpeg`
- `EXTRACT_RETENTION_HOURS` — how long completed downloads stay in `tmp/`

### 5. Run the web app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quick install (extension + auto-launch)

The install script builds everything and sets up the backend to launch automatically when you use the extension:

```bash
# 1. Install yt-dlp (see above) and ffmpeg

# 2. Build and load the extension first
cd chrome-extension && npm install && npm run build && cd ..

# 3. Load chrome-extension/dist/ as unpacked extension in Chrome or Brave
#    (chrome://extensions or brave://extensions -> Developer mode -> Load unpacked)

# 4. Copy the extension ID from the extensions page, then run:
./scripts/install.sh <your-extension-id>
```

After this, the backend starts on demand when you extract audio — no manual terminal needed.

## Manual extension setup

If you prefer to run the backend yourself:

```bash
cd chrome-extension
npm install
npm run build
```

Load `chrome-extension/dist/` as an unpacked extension:

| Browser | URL |
|---|---|
| Chrome | `chrome://extensions/` |
| Brave | `brave://extensions/` |

Enable **Developer mode**, click **Load unpacked**, and select the `dist/` folder.

Start the backend in a terminal (`npm run dev` or `npm start`) before using the extension.

By default the extension points to `http://localhost:3000/api/extract`. If you deploy the backend elsewhere, open the extension settings and update the endpoint.

## How extraction works

1. `POST /api/extract` validates the URL and checks local binaries.
2. The server runs `yt-dlp` for metadata (title + duration).
3. A second `yt-dlp` pass extracts and converts audio to MP3.
4. Progress is streamed back as newline-delimited JSON.
5. The client downloads the file via `GET /api/download?id=...&filename=...`.

## Verification

```bash
npm run build
cd chrome-extension && npm run build
```

Live extraction test against a running local server:

```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  --no-buffer
```

## Storage and cleanup

Extracted files are stored under `tmp/<job-id>/<filename>.mp3`. Old job directories are cleaned up when new extraction requests arrive, controlled by `EXTRACT_RETENTION_HOURS` (default 24h).

## Notes

- This app requires a **Node.js runtime** — it cannot run on serverless/edge platforms (no local binaries).
- Output is always MP3.
- Some sites may require cookies or site-specific workarounds. The architecture is durable because it runs your own tooling, not a third-party API.
