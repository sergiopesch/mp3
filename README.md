# mp3

Extract high-quality audio from 1000+ video platforms. Available as a **web app** and **Chrome extension**.

- **Web App**: Paste URLs from YouTube, Vimeo, Twitter, TikTok, and more
- **Chrome Extension**: One-click extraction from any video page with auto-detection

Built with Next.js, React, and TypeScript. Powered by the [Cobalt API](https://cobalt.tools/).

## 🌐 Web App

The web application provides a simple interface for extracting audio from video URLs.

## 🔌 Chrome Extension

NEW! Install the Chrome extension for seamless integration with video platforms:

### Installation

**⚠️ Important:** The extension requires a proxy server to bypass Cobalt API authentication. You have two options:

**Option 1: Run Locally (Recommended for Development)**
```bash
# Terminal 1: Run the Next.js proxy server
npm run dev

# Terminal 2: Build and load the extension
cd chrome-extension
npm install
npm run build
```

**Option 2: Deploy to Vercel (Recommended for Production)**
```bash
# Deploy the Next.js app
vercel deploy

# Update the API endpoint in extension settings to your deployed URL
# Example: https://your-app.vercel.app/api/extract
```

**Then load the extension:**
1. Open Chrome/Brave and go to `chrome://extensions/` or `brave://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select the `chrome-extension/dist/` folder
4. Go to extension settings and verify/update the API endpoint

### Features

- **One-click extraction** from any video page
- **Auto-URL detection** when you open YouTube, Vimeo, etc.
- **Download history** tracking
- **Context menu** integration (right-click → Extract Audio)
- **Format/quality settings** (MP3/WAV/OGG, 128/256/320 kbps)
- **Auto-download** option

### Building the Extension

```bash
cd chrome-extension
npm install
npm run build
# Extension will be built to dist/
```

## Features (Web App)

- **Universal platform support** — works with YouTube, Vimeo, Twitter/X, TikTok, SoundCloud, and [1000+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- **Best quality extraction** — downloads the highest quality audio and converts to MP3 at maximum bitrate (V0 VBR ~245 kbps)
- **Embedded metadata** — preserves title, artist, album art, and other metadata from the source
- **Real-time progress** — streaming progress updates via server-sent JSON lines so you see download and conversion status live
- **Dark UI** — clean, minimalistic dark-mode interface
- **Single-page workflow** — paste URL, extract, download — no page reloads

## Prerequisites

The application requires two system-level tools to be installed and available on your `PATH`:

### yt-dlp

[yt-dlp](https://github.com/yt-dlp/yt-dlp) is a command-line video downloader. Install it with one of:

```bash
# pip (recommended)
pip install yt-dlp

# Homebrew (macOS)
brew install yt-dlp

# apt (Debian/Ubuntu) — may be outdated, prefer pip
sudo apt install yt-dlp
```

### ffmpeg

[ffmpeg](https://ffmpeg.org/) is a multimedia framework used for audio conversion. Install it with one of:

```bash
# Homebrew (macOS)
brew install ffmpeg

# apt (Debian/Ubuntu)
sudo apt install ffmpeg

# Windows — download from https://ffmpeg.org/download.html
```

Verify both are installed:

```bash
yt-dlp --version
ffmpeg -version
```

## Getting Started

```bash
# Clone the repository
git clone https://github.com/sergiopesch/mp3.git
cd mp3

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the Next.js development server         |
| `npm run build` | Create an optimized production build          |
| `npm start`     | Start the production server (run build first) |

## Project Structure

```
mp3/
├── src/
│   └── app/
│       ├── api/
│       │   ├── extract/
│       │   │   └── route.ts        # POST /api/extract — audio extraction endpoint
│       │   └── download/
│       │       └── route.ts        # GET  /api/download — file download endpoint
│       ├── layout.tsx              # Root layout with metadata
│       ├── page.tsx                # Main page (client component)
│       └── globals.css             # Global styles and CSS variables
├── tmp/                            # Temporary storage for extracted files (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── .gitignore
```

## How It Works

1. The user pastes a video URL into the input field and clicks **Extract Audio**
2. The client sends a `POST /api/extract` request with the URL
3. The server spawns `yt-dlp` to fetch video metadata (title, duration)
4. The server spawns `yt-dlp` again with audio extraction flags to download and convert the video to MP3
5. Progress updates are streamed back to the client in real time as newline-delimited JSON
6. On completion, the client displays the video title, duration, and a **Download MP3** button
7. Clicking download opens `GET /api/download?id=<jobId>&filename=<name>.mp3`, which streams the file from the server's `tmp/` directory

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed technical breakdown.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | [Next.js](https://nextjs.org/) 16   |
| UI        | [React](https://react.dev/) 19      |
| Language  | [TypeScript](https://www.typescriptlang.org/) 5 |
| Styling   | [Tailwind CSS](https://tailwindcss.com/) 4 |
| Audio     | [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/) |
| Runtime   | [Node.js](https://nodejs.org/) 18+  |

## Configuration

### Environment Variables

No environment variables are required for basic operation. The application uses system-installed `yt-dlp` and `ffmpeg` binaries found on the `PATH`.

Optional environment files (`.env`, `.env.local`, etc.) are gitignored. An `.env.example` template is excluded from the ignore rules if you need to add configuration in the future.

### Next.js Config

`next.config.ts` contains the Next.js configuration. Currently minimal with an empty `serverExternalPackages` array.

### TypeScript Config

`tsconfig.json` targets ES2017 with strict mode enabled. The path alias `@/*` maps to `./src/*`.

## API Reference

See [API.md](./API.md) for full endpoint documentation.

**Quick summary:**

- **`POST /api/extract`** — accepts `{ "url": "..." }`, streams progress as newline-delimited JSON, returns job metadata on completion
- **`GET /api/download?id=<jobId>&filename=<name>`** — returns the extracted MP3 file as a download

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

ISC
