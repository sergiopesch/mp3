# Contributing

Guidelines for developing and contributing to the mp3 project.

## Development Setup

### Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)
- **Python 3** with `venv` module
- **yt-dlp** — installed via `./setup.sh` or manually with `pip install yt-dlp`
- **ffmpeg** — install via your system package manager

### Quick Setup

```bash
git clone https://github.com/sergiopesch/mp3.git
cd mp3
./setup.sh
```

### Manual Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

This starts the Next.js dev server at [http://localhost:3000](http://localhost:3000) with hot module replacement.

### Building for Production

```bash
npm run build
npm start
```

## Project Layout

```
src/app/
├── api/
│   ├── extract/route.ts     Audio extraction endpoint (supports time range)
│   ├── metadata/route.ts    Quick metadata lookup (title + duration)
│   └── download/route.ts    File download endpoint
├── layout.tsx               Root layout (server component)
├── page.tsx                 Home page (client component, multi-step flow)
└── globals.css              Global styles and CSS variables

scripts/
├── setup.sh                 → symlinked from ./setup.sh
├── install.sh               Backend + native messaging installer
└── native-host.js           Native messaging host for auto-launching backend

chrome-extension/
├── src/background/          Service worker, API client, backend launcher, handlers
├── src/popup/               Popup UI with React + Tailwind (extract, preview, history)
├── src/options/             Options page for configuring backend endpoint
├── src/shared/              Message types, storage schema
├── src/content/             Content script (MP3 link detection)
└── webpack.config.js        Webpack build for extension
```

## Code Conventions

### TypeScript

- Strict mode is enabled (`"strict": true` in `tsconfig.json`)
- Target is ES2017
- Use the `@/*` path alias for imports from `src/`

### Styling

- Use Tailwind CSS utility classes directly in JSX
- Custom design tokens are defined as CSS variables in `globals.css`
- Reference variables with `var(--name)` inside Tailwind's bracket syntax: `text-[var(--text-secondary)]`
- Tailwind v4 in the web app, Tailwind v3 in the extension

### API Routes

- API routes live in `src/app/api/{name}/route.ts`
- Export named functions matching HTTP methods: `GET`, `POST`
- Return `Response` objects (Web API standard)
- Validate all input before processing

## Key Technical Decisions

### Streaming responses

The extract endpoint uses `ReadableStream` to stream progress updates as newline-delimited JSON. This was chosen over Server-Sent Events (SSE) or WebSockets for simplicity — it works with a standard `fetch()` call and requires no additional libraries.

### Time range extraction

The extract endpoint accepts optional `startTime` and `endTime` parameters. When provided, it passes `--download-sections` and `--force-keyframes-at-cuts` to yt-dlp, which downloads and converts only the requested section.

### Metadata endpoint

`POST /api/metadata` returns just the title and duration without starting extraction. This lets the UI show a preview with a range slider before the user commits to downloading.

### System process spawning

`yt-dlp` and `ffmpeg` are invoked via `child_process.spawn()` rather than being wrapped in a library. This keeps the dependency tree minimal and gives full control over CLI arguments.

### Temporary file storage

Extracted files are stored in `tmp/{jobId}/` at the project root. Old jobs are cleaned up opportunistically when new extraction requests arrive, based on `EXTRACT_RETENTION_HOURS` (default 24h). Failed extractions clean up their job directory immediately.

### Native messaging

The extension can auto-launch the backend through Chrome Native Messaging. The host script (`scripts/native-host.js`) checks if the backend is running and starts it if needed. This is configured by the `setup.sh` install script.

## Common Development Tasks

### Modifying the extraction process

The extraction logic is in `src/app/api/extract/route.ts`. Key areas:

- `spawnAndCapture()` — Phase 1: yt-dlp metadata retrieval (title + duration)
- Extraction `spawn()` call — Phase 2: yt-dlp download and conversion with `--extract-audio --audio-format mp3`
- `--download-sections` — used when `startTime`/`endTime` are provided for partial extraction
- Progress parsing — regex matches on `download:NN.N%` from `--progress-template` output
- Conversion detection — looks for `[ExtractAudio]` in stdout

### Adding a new API endpoint

1. Create `src/app/api/{name}/route.ts`
2. Export the HTTP method handler (`GET`, `POST`, etc.)

### Changing the design

- Color tokens are in `src/app/globals.css` as CSS variables
- Component styles are inline Tailwind classes in `src/app/page.tsx`
- The layout structure is in `src/app/layout.tsx`

## Troubleshooting

### "yt-dlp: command not found"

yt-dlp is not installed. Run `./setup.sh` to install it, or install manually with `pip install yt-dlp`.

### "ffmpeg not found" errors during extraction

ffmpeg is not on your `PATH`. Install it via your system package manager and verify with `ffmpeg -version`.

### Extraction succeeds but no MP3 file found

This can happen if ffmpeg fails during the audio conversion step. Check the server console for stderr output from the yt-dlp process.

### Port 3000 already in use

Another process is using port 3000. Either stop it or run Next.js on a different port:

```bash
npm run dev -- -p 3001
```
