# MP3 Extractor - Browser Extension

A browser extension build for extracting audio from YouTube videos and supported web pages. The current build targets Chrome/Brave directly and now includes a Firefox manifest variant for packaging.

## Features

- **YouTube Audio Extraction** - Extract audio from YouTube videos directly (no server required)
- **MP3 Detection** - Automatically detects MP3 links and audio elements on any web page
- **Context Menu** - Right-click any link or page to extract audio
- **Download History** - Track all your extractions with status and timestamps
- **Configurable Settings** - Choose audio format (MP3/WAV/OGG), bitrate (128/256/320 kbps), and auto-download behavior
- **Other Platforms** - Support for TikTok, Vimeo, and more via a proxy API server

## Installation

### From Source

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome or Brave:
   - Open `chrome://extensions/` or `brave://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

4. Firefox packaging:
   - A Firefox-specific manifest is now included at `src/manifest/firefox-manifest.json`
   - The codebase still needs a proper Firefox packaging/release pass before claiming production-ready Firefox support in the store

### Development

Run webpack in watch mode for auto-rebuilding on changes:

```bash
npm run dev
```

After making changes, go to `chrome://extensions/` and click the reload button on the extension.

## How It Works

### YouTube (Standalone)

When you paste a YouTube URL or are on a YouTube page, the extension extracts audio directly:

1. If you're on the YouTube video page, the **content script** extracts player data from the already-loaded page (most reliable method)
2. As a fallback, the service worker fetches the video page directly

No server or API key is needed for YouTube.

### Other Platforms (Requires Proxy Server)

For non-YouTube platforms (TikTok, Vimeo, SoundCloud, etc.), the extension needs a proxy API server:

1. Set up and run the proxy server (see the parent project)
2. Configure the API endpoint in the extension's Settings page
3. Default endpoint: `https://mp3-sergiopeschs-projects.vercel.app/api/extract`

## Project Structure

```
chrome-extension/
  src/
    manifest/           # Chrome extension manifest
    background/         # Service worker (background process)
      api/              # Audio extraction APIs (YouTube, Cobalt proxy)
      handlers/         # Message handlers (extract, download, context menu)
      storage/          # Chrome storage managers (history, settings)
      utils/            # Message router utility
    content/            # Content script (runs on web pages)
    popup/              # Extension popup UI (React)
      components/       # React components
      hooks/            # Custom React hooks
      styles/           # CSS styles
    options/            # Settings page (React)
    shared/             # Shared types and messaging utilities
      types/            # TypeScript interfaces
      messaging/        # Message sending helpers
  public/               # Static assets (icons)
  dist/                 # Built extension (load this in Chrome)
```

## Architecture

- **Manifest V3** - Uses the modern Chrome extension manifest format
- **Service Worker** - Background process handles extraction, downloads, and storage
- **Content Script** - Injected into web pages to detect MP3s and extract YouTube data
- **React Popup** - Modern dark-themed UI with extract and history tabs
- **Message Router** - Type-safe message passing between popup, content script, and service worker
- **Chrome Storage** - Settings and history persisted via `chrome.storage.local`

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save settings and extraction history |
| `downloads` | Download extracted audio files |
| `contextMenus` | Right-click "Extract Audio" menu item |
| `activeTab` | Access the current tab's URL |
| `notifications` | Show extraction success/error notifications |
| `<all_urls>` | Fetch audio from any website |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Watch mode - auto-rebuild on changes |
| `npm run build` | Production build to `dist/` |
| `npm run package` | Build and create `extension.zip` |

## Known Limitations

- **Upstream extraction service auth**: the current deployed `/api/extract` flow depends on an upstream Cobalt endpoint that is presently returning `error.api.auth.jwt.missing` until properly configured. That means end-to-end extraction is not yet reliable in production, regardless of browser.
- **YouTube signature-ciphered streams**: Some YouTube videos use encrypted stream URLs that cannot be decoded without running YouTube's player JavaScript. In these cases, extraction will fail with "No audio stream found."
- **YouTube bot detection**: The direct fetch fallback may be blocked by YouTube's bot detection. For best results, open the YouTube video in a tab before extracting.
- **Firefox support**: a Firefox manifest variant now exists, but Firefox compatibility should be verified in a real add-on packaging pass before claiming full production support.
- **Audio format**: YouTube provides audio in M4A/WebM format. The filename uses `.mp3` extension but the actual codec depends on what YouTube provides.

## Tech Stack

- TypeScript
- React 19
- Tailwind CSS 3
- Webpack 5
- Chrome Extension Manifest V3
