# MP3 Extractor - Browser Extension

A browser extension for extracting audio from video URLs using your self-hosted mp3 backend. Works in Chrome and Brave.

## Features

- **Extract from any supported site** - YouTube, TikTok, Vimeo, SoundCloud, and hundreds more (anything yt-dlp supports)
- **Popup extraction** - Paste a URL or auto-detect the current tab's video URL
- **Context menu** - Right-click any link or page and select "Extract Audio"
- **MP3 detection** - Detects MP3 links and audio elements on any web page
- **Download history** - Track all extractions with status and timestamps
- **Auto-download** - Extracted files download automatically (configurable)

## Prerequisites

The extension requires the mp3 backend running locally or on a server you control. See the [main project README](../README.md) for backend setup.

## Installation

### Build from source

```bash
cd chrome-extension
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/dist/` folder

### Load in Brave

1. Open `brave://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/dist/` folder

### Configure the backend endpoint

By default the extension points to `http://localhost:3000/api/extract`. If your backend runs elsewhere, open the extension's **Settings** page and update the API endpoint.

## Development

Run webpack in watch mode for auto-rebuilding:

```bash
npm run dev
```

After changes, go to `chrome://extensions/` (or `brave://extensions/`) and click the reload button.

## How it works

1. You provide a video URL (paste it, or the extension detects it from the current tab)
2. The extension sends the URL to your self-hosted `/api/extract` endpoint
3. The backend runs `yt-dlp` + `ffmpeg` to extract and convert the audio to MP3
4. Progress is streamed back to the popup as newline-delimited JSON
5. On completion, the file is downloaded from the backend via `chrome.downloads`

All extraction happens on your own machine — no third-party APIs involved.

## Project structure

```
chrome-extension/
  src/
    manifest/           # Chrome extension manifest (MV3)
    background/         # Service worker
      api/              # API client (calls self-hosted backend)
      handlers/         # Message handlers (extract, download, context menu)
      storage/          # Chrome storage managers (history, settings)
      utils/            # Message router
    content/            # Content script (MP3 link detection)
    popup/              # Popup UI (React + Tailwind)
      components/       # React components
      styles/           # CSS styles
    options/            # Settings page (React)
    shared/             # Shared types and messaging
  dist/                 # Built extension (load this folder)
```

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save settings and extraction history |
| `downloads` | Download extracted audio files |
| `contextMenus` | Right-click "Extract Audio" menu item |
| `activeTab` | Access the current tab's URL |
| `notifications` | Show extraction status notifications |
| `<all_urls>` | Fetch audio from the backend |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Watch mode with auto-rebuild |
| `npm run build` | Production build to `dist/` |
| `npm run package` | Build and create `extension.zip` |

## Tech stack

- TypeScript
- React 19
- Tailwind CSS 3
- Webpack 5
- Chrome Extension Manifest V3
