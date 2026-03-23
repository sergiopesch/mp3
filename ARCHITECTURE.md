# Architecture

## Overview

`mp3` is a Next.js application with a self-owned extraction backend.

Instead of calling a public third-party API, the server runs local tooling directly:

- `yt-dlp` for metadata lookup and media download
- `ffmpeg` for final MP3 conversion
- Next.js route handlers for orchestration and download serving

The Chrome extension talks to the same backend through `/api/extract`.

## Request flow

```text
Browser / Extension
  -> POST /api/extract
  -> Next.js route validates URL
  -> server checks yt-dlp + ffmpeg availability
  -> yt-dlp metadata pass
  -> yt-dlp extraction pass with ffmpeg conversion
  -> progress streamed back as NDJSON
  -> file stored under tmp/<job-id>/
  -> client downloads via GET /api/download
```

## Backend components

### `src/app/api/extract/route.ts`

Responsibilities:
- validate input
- ensure extractor binaries exist
- create a per-job temp directory
- fetch title + duration metadata
- run extraction and conversion
- stream progress messages to the client
- return final metadata and a local `downloadPath`
- opportunistically clean up expired old jobs

Important implementation details:
- uses `runtime = "nodejs"`
- prefers a user-level `~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp` install by default
- uses `FFMPEG_LOCATION` so `yt-dlp` can find `ffmpeg`
- output template includes both title and media id for filename stability

### `src/app/api/download/route.ts`

Responsibilities:
- validate `id` and `filename`
- prevent path traversal
- stream local MP3 files from `tmp/`

## Frontend

### `src/app/page.tsx`

The UI reads the extraction response as a stream and reacts to three message types:
- `progress`
- `done`
- `error`

That restores live progress instead of a single blocking request/response cycle.

## Extension architecture

The extension uses the same self-hosted backend for all extraction.

Components:
- `chrome-extension/src/background/api/cobalt.ts` — API client that calls `/api/extract` and reads the NDJSON stream
- `chrome-extension/src/background/handlers/extract.ts` — message handler for popup-initiated extractions
- `chrome-extension/src/background/handlers/context-menu.ts` — right-click "Extract Audio" context menu
- `chrome-extension/src/background/handlers/download.ts` — triggers `chrome.downloads` for manual download
- `chrome-extension/src/content/content-script.ts` — detects MP3 links on the current page
- `chrome-extension/src/popup/` — React popup UI with extract form, progress, history
- `chrome-extension/src/options/` — options page for configuring the backend endpoint

Flow:
- sends the source URL to the configured `apiEndpoint` (default `http://localhost:3000/api/extract`)
- reads the NDJSON stream in the background service worker
- converts the relative `downloadPath` from the `done` message into an absolute download URL
- downloads from the backend via `chrome.downloads`

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
