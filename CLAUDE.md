# mp3 — Self-Hosted Audio Extractor

## What this is

A Next.js app that extracts audio from video URLs using local `yt-dlp` and `ffmpeg` binaries. No public third-party extraction API. A Chrome extension calls the same backend.

## Commands

```bash
npm run dev          # Next.js dev server on :3000
npm run build        # Production build
npm run start        # Start production server
```

Extension (separate project in `chrome-extension/`):
```bash
cd chrome-extension && npm install
cd chrome-extension && npm run build    # Webpack production build
cd chrome-extension && npm run dev      # Webpack watch mode
```

There is no test suite, no linter script, no CI pipeline, and no Docker setup.

## Project structure

```
src/app/
  api/extract/route.ts   POST /api/extract — orchestrates yt-dlp + ffmpeg, streams NDJSON progress
  api/download/route.ts  GET /api/download  — serves extracted MP3 from tmp/
  page.tsx               Client component — URL input, progress, download UI
  layout.tsx             Root layout (server component)
  globals.css            Dark theme CSS variables, Tailwind import

chrome-extension/
  src/background/        Service worker, extract/download handlers, API client (cobalt.ts)
  src/popup/             Popup UI with React + Tailwind (v3), hooks for extract/history
  src/options/           Options page for configuring backend endpoint
  src/shared/            Message types, storage schema (Settings includes apiEndpoint)
  src/manifest/          Chrome MV3 manifest
  webpack.config.js      Webpack build for extension

tmp/                     Temporary job directories (gitignored)
```

## Extraction flow

1. `POST /api/extract` receives `{ url }`, validates it, checks binary availability
2. Creates `tmp/<job-uuid>/` directory
3. **Metadata pass**: `yt-dlp --print title --print duration` — captures title and duration
4. **Extraction pass**: `yt-dlp --extract-audio --audio-format mp3` with `--progress-template` for percent tracking
5. Progress streamed as NDJSON lines: `{"type":"progress","message":"..."}`
6. On completion: `{"type":"done","data":{id, title, duration, filename, downloadPath}}`
7. On failure: `{"type":"error","message":"..."}` and job directory is cleaned up
8. Client reads stream via `fetch().body.getReader()` and updates UI reactively

## Critical invariants

### Route handlers
- Both routes use `runtime = "nodejs"` — required for `child_process.spawn()` and `fs`
- Never move these to edge runtime
- Extract route uses `maxDuration = 300`, download uses `maxDuration = 60`
- Responses use Web API `Response` objects

### NDJSON streaming
- Progress is streamed as newline-delimited JSON via `ReadableStream`
- Three message types: `progress`, `done`, `error`
- The frontend and extension both parse this stream — changing the contract breaks both consumers
- Do not replace streaming with a blocking request/response pattern

### Local binaries
- `yt-dlp` default: `~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp`
- `ffmpeg` default: `/usr/bin/ffmpeg`
- Overridable via `YT_DLP_BIN` and `FFMPEG_BIN` env vars
- `FFMPEG_LOCATION` is passed to yt-dlp's env so it can find ffmpeg
- Binary availability is checked before each extraction

### File handling and storage
- Jobs stored in `tmp/<uuid>/` with sanitized filenames
- Output template: `%(title).120B [%(id)s].%(ext)s` — includes media ID for uniqueness
- Filenames are sanitized (special chars removed, truncated to 120 chars)
- Old jobs cleaned up opportunistically based on `EXTRACT_RETENTION_HOURS` (default 24h)
- Download route validates `id` and `filename` against path traversal (`..`, `/`, `\`)

### Extension contract
- Extension calls configurable `apiEndpoint` (default `http://localhost:3000/api/extract`)
- Reads the same NDJSON stream, extracts `done` message
- Converts relative `downloadPath` to absolute URL using `apiEndpoint` as base
- Settings stored in `chrome.storage.local` with `apiEndpoint` field
- Extension file: `chrome-extension/src/background/api/cobalt.ts`

## Security expectations

- Never hardcode secrets or read `.env` files
- Validate all incoming URLs with `new URL()`
- Defend download route against path traversal (already implemented)
- Sanitize all filenames before writing to disk
- Do not pass unsanitized user input to shell commands
- Do not expose internal file paths or stack traces in error responses
- Do not introduce SSRF by following redirects or fetching arbitrary URLs server-side

## Environment variables

```
YT_DLP_BIN              # Path to yt-dlp binary
FFMPEG_BIN              # Path to ffmpeg binary
EXTRACT_RETENTION_HOURS # Hours before old jobs are pruned (default: 24)
```

## Making changes safely

- Read existing code before modifying — the codebase is small, read it all
- Preserve the NDJSON streaming contract (both web UI and extension depend on it)
- Preserve `runtime = "nodejs"` on both route handlers
- Test that `npm run build` succeeds after changes
- If modifying extract/download routes, verify path traversal guards remain intact
- If changing the stream message shape, update both `src/app/page.tsx` and `chrome-extension/src/background/api/cobalt.ts`
- Keep the single-component UI pattern unless explicitly asked to refactor
- Tailwind v4 in the web app, Tailwind v3 in the extension — they use different configs
