# Chrome Extension

Applies to: `chrome-extension/**`

## Architecture
- MV3 Chrome extension with separate webpack build (`webpack.config.js`)
- Entry points: `service-worker.ts`, `popup/index.tsx`, `options/index.tsx`, `content-script.ts`
- React + Tailwind v3 for popup and options UI
- Message passing via `chrome.runtime.sendMessage` with typed messages (`shared/types/messages.ts`)
- Settings stored in `chrome.storage.local` (schema in `shared/types/storage.ts`)

## Backend contract
- The extension calls the self-hosted `/api/extract` and `/api/metadata` endpoints
- Default endpoint: `http://localhost:3000/api/extract` (configurable in options)
- The API client is in `src/background/api/cobalt.ts` (name is historical, it now calls the self-hosted backend)
- `fetchMetadata()` calls `/api/metadata` for title + duration (used for preview)
- `extractAudio()` calls `/api/extract` with optional `startTime`/`endTime` for time range
- It reads the same NDJSON stream as the web UI
- On `done` message, it converts the relative `downloadPath` to an absolute URL using `buildAbsoluteDownloadUrl()`
- Auto-download uses `chrome.downloads.download()`

## Backend launcher
- `src/background/api/backend-launcher.ts` checks if the backend is reachable
- If not, it uses Chrome Native Messaging (`com.mp3.extractor`) to start it
- The popup shows a "Start Backend" button when the backend is offline
- Native messaging host: `scripts/native-host.js`

## Settings
- `apiEndpoint`: URL of the self-hosted backend (default: `http://localhost:3000/api/extract`)
- `autoDownload`: whether to auto-download after extraction (default: `true`)
- Settings are managed by `SettingsManager` in `src/background/storage/settings.ts`

## Message types
- `FETCH_METADATA` — fetches title + duration from `/api/metadata`
- `EXTRACT_AUDIO` — starts extraction with optional `startTime`/`endTime`
- `DOWNLOAD_AUDIO` — triggers manual download via `chrome.downloads`
- `CHECK_BACKEND` — checks if the backend is reachable
- `START_BACKEND` — starts the backend via native messaging
- `GET_HISTORY`, `CLEAR_HISTORY` — manage extraction history
- `GET_SETTINGS`, `UPDATE_SETTINGS` — manage extension settings

## Popup flow
1. Popup opens — checks backend status (shows "Start Backend" if offline)
2. User enters URL — clicks "Get Info" (sends `FETCH_METADATA`)
3. Preview shows title, duration, range slider
4. User adjusts range and clicks Extract (sends `EXTRACT_AUDIO` with time range)
5. Progress bar shown during extraction
6. Done state shows filename + Download button

## Key rules
- If the NDJSON stream contract changes in the backend, update `cobalt.ts` to match
- Do not introduce calls to public extraction APIs — the project is self-hosted by design
- Do not hardcode the backend URL — always read from settings
- Do not expose secrets or API keys in extension code (there are none currently, keep it that way)
- The extension has its own `package.json`, `tsconfig.json`, and `node_modules` — independent from the web app
- Build: `cd chrome-extension && npm run build` (webpack production mode)
- Dev: `cd chrome-extension && npm run dev` (webpack watch mode)

## UI notes
- The popup has Extract and History tabs
- The Extract tab has a multi-step flow: URL input → preview with range slider → extracting → done
- The content script detects MP3 links on pages
- The context menu provides "Extract Audio" on links and pages (full clip only)
