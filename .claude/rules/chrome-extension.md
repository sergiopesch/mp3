# Chrome Extension

Applies to: `chrome-extension/**`

## Architecture
- MV3 Chrome extension with separate webpack build (`webpack.config.js`)
- Entry points: `service-worker.ts`, `popup/index.tsx`, `options/index.tsx`, `content-script.ts`
- React + Tailwind v3 for popup and options UI
- Message passing via `chrome.runtime.sendMessage` with typed messages (`shared/types/messages.ts`)
- Settings stored in `chrome.storage.local` (schema in `shared/types/storage.ts`)

## Backend contract
- The extension calls the self-hosted `/api/extract` endpoint — not a public third-party API
- Default endpoint: `http://localhost:3000/api/extract` (configurable in options)
- The API client is in `src/background/api/cobalt.ts` (name is historical, it now calls the self-hosted backend)
- It reads the same NDJSON stream as the web UI
- On `done` message, it converts the relative `downloadPath` to an absolute URL using `buildAbsoluteDownloadUrl()`
- Auto-download uses `chrome.downloads.download()`

## Settings
- `apiEndpoint`: URL of the self-hosted backend (default: `http://localhost:3000/api/extract`)
- `autoDownload`: whether to auto-download after extraction (default: `true`)
- Settings are managed by `SettingsManager` in `src/background/storage/settings.ts`

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
- The content script detects MP3 links on pages (responds to `DETECT_MP3S` messages)
- The context menu provides "Extract Audio" on links and pages
