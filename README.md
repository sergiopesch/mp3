# mp3

Self-hosted audio extraction from video URLs, powered by your own Next.js backend with `yt-dlp` and `ffmpeg`.

This repo includes:
- a **web app** for pasting a URL and downloading the extracted MP3
- a **Chrome extension** that calls the same backend

The old dependency on the public Cobalt API has been removed. Extraction now runs through a local or self-hosted backend you control.

## What changed

- **Backend is self-owned again**: `src/app/api/extract` now spawns local `yt-dlp` and uses `ffmpeg` for conversion.
- **Streaming progress is back**: the web app consumes newline-delimited JSON progress events from the server.
- **Downloads are served locally**: extracted files live under `tmp/<job-id>/` and are downloaded via `GET /api/download`.
- **Extension aligned to backend**: the extension now expects your own `/api/extract` endpoint instead of a public third-party API.
- **User-level yt-dlp supported**: defaults to `~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp`, which avoids mutating the system Python install.

## Requirements

You need:
- Node.js 18+
- `ffmpeg` available on the machine
- `yt-dlp` available either:
  - in a dedicated user-level virtualenv, or
  - via `YT_DLP_BIN`

On this machine, `ffmpeg` is already present at `/usr/bin/ffmpeg`.

## Local setup

### 1. Install app dependencies

```bash
npm install
```

### 2. Install `yt-dlp`

A user-level Python virtualenv is the safest sane default here and avoids both system package conflicts and Next.js scanning issues inside the repo:

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

Copy the example file if you want explicit overrides:

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

## Web app flow

1. Paste a supported video URL.
2. `POST /api/extract` validates the URL and checks local extractor binaries.
3. The server runs `yt-dlp` once for metadata, then again for extraction/conversion.
4. The route streams progress messages back to the browser.
5. On success, the UI exposes a download button pointing at `/api/download?id=...&filename=...`.

## Browser extension

The extension now uses the same self-hosted backend for extraction.

### Build

```bash
cd chrome-extension
npm install
npm run build
```

Load `chrome-extension/dist/` as an unpacked extension.

### Default endpoint

By default the extension points to:

```text
http://localhost:3000/api/extract
```

If you deploy the app elsewhere, open the extension settings and change the API endpoint to your deployed backend’s `/api/extract` URL.

## Verification checklist

Useful local checks:

```bash
npm run build
cd chrome-extension && npm run build
```

For a live extraction test against a running local server:

```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  --no-buffer
```

Then download the resulting file from the returned `downloadPath`.

## Storage and cleanup

Extracted files are stored under:

```text
tmp/<job-id>/<filename>.mp3
```

Old job directories are cleaned up opportunistically when new extraction requests arrive. Retention is controlled by `EXTRACT_RETENTION_HOURS`.

## Notes

- This app now assumes a **Node.js runtime**, not an edge runtime.
- The backend currently always outputs MP3.
- Some sites may still fail if they require cookies, login state, or site-specific extractor workarounds. The core architecture is now durable because it is not pinned to a public API that can revoke access.
