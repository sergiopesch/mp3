# MP3 Extractor — Browser Extension

Extract audio from any video URL as MP3, right from your browser.

Works in **Chrome** and **Brave**. See the [main README](../README.md) for full setup instructions.

## Features

- **Popup extraction** — paste a URL or auto-detect the current tab's video
- **Right-click menu** — right-click any link and select "Extract Audio"
- **MP3 detection** — finds MP3 links on any page
- **Download history** — see all your past extractions
- **Auto-download** — files download automatically after extraction
- **Auto-launch** — the backend starts on demand when you use the extension

## Quick setup

```bash
# From the project root:
./setup.sh                       # Installs everything, builds the extension
# Load chrome-extension/dist/ in your browser (see main README)
./setup.sh <extension-id>        # Connects the extension to the backend
```

## Manual build

```bash
cd chrome-extension
npm install
npm run build
```

Load `dist/` as an unpacked extension:
- Chrome: `chrome://extensions/`
- Brave: `brave://extensions/`

Enable **Developer mode**, click **Load unpacked**, select the `dist/` folder.

## Development

```bash
npm run dev    # Watch mode — auto-rebuilds on file changes
```

After changes, reload the extension from your browser's extensions page.

## How it works

1. You provide a video URL (paste it, or the extension detects it from your current tab)
2. The extension sends the URL to the backend running on your machine
3. `yt-dlp` + `ffmpeg` extract and convert the audio to MP3
4. The file downloads automatically

If the backend isn't running, the popup shows a **Start Backend** button to launch it.

## Settings

Click the gear icon in the popup header to open settings:

- **API endpoint** — where the backend is running (default: `http://localhost:3000/api/extract`)
- **Auto-download** — download files automatically after extraction (default: on)

## Project structure

```
src/
  manifest/           Chrome extension manifest (MV3)
  background/         Service worker
    api/              Backend API client + auto-launcher
    handlers/         Extract, download, context menu handlers
    storage/          History and settings managers
  content/            Content script (MP3 link detection)
  popup/              Popup UI (React + Tailwind)
  options/            Settings page (React)
  shared/             Shared types and messaging
dist/                 Built extension — load this folder
```

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save settings and download history |
| `downloads` | Download extracted MP3 files |
| `contextMenus` | "Extract Audio" in the right-click menu |
| `activeTab` | Read the current tab's URL |
| `notifications` | Show success/error notifications |
| `nativeMessaging` | Auto-start the backend when needed |
| `<all_urls>` | Connect to the backend from any page |
