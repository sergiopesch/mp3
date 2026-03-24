# Architecture

## Overview

`mp3` is a Next.js application with a self-owned extraction backend.

Instead of calling a public third-party API, the server runs local tooling directly:

- `yt-dlp` for metadata lookup and media download
- `ffmpeg` for final MP3 conversion
- Next.js route handlers for orchestration and download serving

The Chrome/Brave extension talks to the same backend through `/api/extract` and `/api/metadata`.

## Request flow

```text
Browser / Extension
  -> POST /api/metadata (optional — returns title + duration for preview)
  -> POST /api/extract { url, startTime?, endTime? }
  -> Next.js route validates URL and time range
  -> server checks yt-dlp + ffmpeg availability
  -> yt-dlp metadata pass (title + duration)
  -> yt-dlp extraction pass with ffmpeg conversion
     (with --download-sections if time range specified)
  -> progress streamed back as NDJSON
  -> file stored under tmp/<job-id>/
  -> client downloads via GET /api/download
```

## Backend components

### `src/app/api/extract/route.ts`

Responsibilities:
- validate input (URL, optional startTime/endTime)
- ensure extractor binaries exist
- create a per-job temp directory
- fetch title + duration metadata
- run extraction and conversion (full or partial via `--download-sections`)
- stream progress messages to the client
- return final metadata and a local `downloadPath`
- opportunistically clean up expired old jobs

Important implementation details:
- uses `runtime = "nodejs"`
- prefers a user-level `~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp` install by default
- uses `FFMPEG_LOCATION` so `yt-dlp` can find `ffmpeg`
- output template includes both title and media id for filename stability
- uses `--download-sections` and `--force-keyframes-at-cuts` for time range extraction

### `src/app/api/metadata/route.ts`

Lightweight endpoint for fetching title and duration without starting extraction. Used by the web UI and extension to show the preview/range slider before the user commits to extraction.

### `src/app/api/download/route.ts`

Responsibilities:
- validate `id` and `filename`
- prevent path traversal
- stream local MP3 files from `tmp/`

## Frontend

### `src/app/page.tsx`

The web UI has a multi-step flow:
1. **Idle** — URL input + "Get Info" button
2. **Preview** — title, duration, dual range slider for time selection
3. **Extracting** — spinner + progress messages from the NDJSON stream
4. **Done** — result card + Download MP3 button
5. **Error** — error message + Try again

The UI reads NDJSON stream messages: `progress`, `metadata`, `done`, `error`.

## Extension architecture

The extension uses the same self-hosted backend for all extraction.

Components:
- `chrome-extension/src/background/api/cobalt.ts` — API client: calls `/api/extract` and `/api/metadata`, reads the NDJSON stream
- `chrome-extension/src/background/api/backend-launcher.ts` — checks if backend is running, starts it via Native Messaging
- `chrome-extension/src/background/handlers/extract.ts` — message handler for popup-initiated extractions (with time range)
- `chrome-extension/src/background/handlers/context-menu.ts` — right-click "Extract Audio" context menu
- `chrome-extension/src/background/handlers/download.ts` — triggers `chrome.downloads` for manual download
- `chrome-extension/src/content/content-script.ts` — detects MP3 links on the current page
- `chrome-extension/src/popup/` — React popup UI with extract form, range preview, progress, history
- `chrome-extension/src/options/` — options page for configuring the backend endpoint

Flow:
1. Popup opens — checks if backend is running (shows "Start Backend" button if not)
2. User pastes URL — "Get Info" fetches metadata via `FETCH_METADATA` message
3. Preview shows title, duration, and range slider
4. User adjusts range (or keeps full clip) and clicks Extract
5. `EXTRACT_AUDIO` message includes optional `startTime`/`endTime`
6. Service worker calls `/api/extract` with time range
7. On `done`, converts relative `downloadPath` to absolute URL
8. Downloads from the backend via `chrome.downloads`

### Native Messaging

The extension can auto-launch the backend via Chrome Native Messaging:
- `scripts/native-host.js` — Node.js script that checks/starts the backend
- Registered in browser NativeMessagingHosts directories by `setup.sh`
- Extension uses `nativeMessaging` permission to communicate with the host

## Configuration

Optional environment variables:

- `YT_DLP_BIN`
- `FFMPEG_BIN`
- `EXTRACT_RETENTION_HOURS`

See `.env.example`.

## Storage model

```text
tmp/
  <job-id>/
    <sanitized-filename>.mp3
```

Old jobs are not deleted immediately after download. They are retained for a configurable period and pruned when future extraction requests arrive.

## Known limits

- Output is currently always MP3.
- Some providers may require cookies or site-specific handling beyond the basic local setup.
- This design is suitable for a self-hosted machine or VPS, not a serverless edge environment without local process execution.
