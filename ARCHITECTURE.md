# Architecture

This document describes the technical architecture of the mp3 audio extractor application.

## Overview

mp3 is a Next.js application that wraps the `yt-dlp` and `ffmpeg` command-line tools behind a web interface. The frontend is a single React client component that communicates with two API routes on the backend. Audio extraction is performed by spawning system processes, and progress is streamed to the client in real time.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              page.tsx (Client Component)           │  │
│  │                                                   │  │
│  │  URL Input  ──►  POST /api/extract                │  │
│  │                      │                            │  │
│  │  Progress  ◄── Streaming JSON lines               │  │
│  │                      │                            │  │
│  │  Download  ──►  GET /api/download                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js Server                        │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  /api/extract       │  │  /api/download           │  │
│  │  (route.ts)         │  │  (route.ts)              │  │
│  │                     │  │                          │  │
│  │  1. Spawn yt-dlp    │  │  1. Validate params      │  │
│  │     (get info)      │  │  2. Check file exists    │  │
│  │  2. Spawn yt-dlp    │  │  3. Stream file          │  │
│  │     (download+mp3)  │  │                          │  │
│  │  3. Stream progress │  │                          │  │
│  └────────┬────────────┘  └──────────┬───────────────┘  │
│           │                          │                  │
│           ▼                          ▼                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │              tmp/{jobId}/                        │    │
│  │              Temporary file storage              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  System Dependencies                    │
│                                                         │
│  ┌──────────────┐         ┌──────────────────────┐      │
│  │   yt-dlp     │────────►│      ffmpeg          │      │
│  │              │         │  (audio conversion)  │      │
│  │  - Download  │         └──────────────────────┘      │
│  │  - Metadata  │                                       │
│  │  - Extract   │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/app/
├── api/
│   ├── extract/route.ts    Server-side extraction logic
│   └── download/route.ts   Server-side file serving
├── layout.tsx              Root HTML layout and metadata
├── page.tsx                Client-side UI and state management
└── globals.css             CSS variables and base styles
```

## Frontend Architecture

### Component: `Home` (`src/app/page.tsx`)

The entire UI is a single client component (`"use client"`) that manages the full extraction workflow through a state machine.

#### State Machine

```
         ┌──────────────────────────────┐
         │                              │
         ▼                              │
     ┌────────┐   handleExtract   ┌────────────┐
     │  idle  │──────────────────►│ extracting │
     └────────┘                   └─────┬──────┘
         ▲                              │
         │                      ┌───────┴───────┐
         │                      │               │
    handleReset           success            failure
         │                      │               │
         │                ┌─────▼─┐        ┌────▼──┐
         ├────────────────│ done  │        │ error │
         │                └───────┘        └───────┘
         │                                      │
         └──────────────────────────────────────┘
```

**States:**

| State        | Description                                   | UI                                     |
| ------------ | --------------------------------------------- | -------------------------------------- |
| `idle`       | Waiting for user input                        | URL input + Extract button + platforms |
| `extracting` | Extraction in progress                        | Spinner + progress text                |
| `done`       | Extraction complete, file ready               | Title/duration card + Download button  |
| `error`      | Something went wrong                          | Error message + Try again button       |

#### React State

| Variable   | Type              | Purpose                                |
| ---------- | ----------------- | -------------------------------------- |
| `url`      | `string`          | The video URL entered by the user      |
| `status`   | `Status`          | Current state machine state            |
| `progress` | `string`          | Latest progress message from server    |
| `result`   | `JobResult\|null` | Extraction result (id, title, etc.)    |
| `error`    | `string`          | Error message when status is "error"   |
| `inputRef` | `Ref<HTMLInput>`  | Reference to input element for focus   |

#### Streaming Response Handling

The client reads the response body as a stream using the Fetch API's `ReadableStream`:

1. `fetch("/api/extract", ...)` returns a streaming response
2. `res.body.getReader()` provides a reader for the stream
3. A `TextDecoder` converts binary chunks to text
4. A line buffer accumulates text and splits on `\n`
5. Each complete line is parsed as JSON
6. Messages are dispatched by `type`: `progress`, `done`, or `error`

This approach allows the UI to update in real time without polling or WebSockets.

## Backend Architecture

### Extract Endpoint (`src/app/api/extract/route.ts`)

**Method:** `POST`

This is the core of the application. It performs a two-phase extraction process:

#### Phase 1: Metadata Retrieval

```bash
yt-dlp --no-playlist --print "%(title)s" --print "%(duration)s" <url>
```

- Spawns `yt-dlp` with `child_process.spawn()`
- Collects stdout for title and duration
- Collects stderr for error messages
- On exit code 0, proceeds to phase 2
- On failure, sends an error message and closes the stream

#### Phase 2: Audio Extraction

```bash
yt-dlp --no-playlist -x --audio-format mp3 --audio-quality 0 \
  --embed-thumbnail --add-metadata \
  --output "tmp/{jobId}/%(title).80s.%(ext)s" \
  --newline --progress <url>
```

| Flag                | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `--no-playlist`     | Only process single video, not playlists      |
| `-x`                | Extract audio only                            |
| `--audio-format mp3`| Convert to MP3 format                         |
| `--audio-quality 0` | Best quality (V0 VBR, ~245 kbps)              |
| `--embed-thumbnail` | Embed cover art in the MP3 file               |
| `--add-metadata`    | Preserve metadata (title, artist, etc.)       |
| `--output`          | Output path template (title truncated to 80 chars) |
| `--newline`         | Print progress on new lines (for parsing)     |
| `--progress`        | Show download progress                        |

**Progress Parsing:**

The handler monitors stdout for two patterns:

- `/(\d+\.?\d*)%/` — Download percentage, sent as `"Downloading... X%"`
- `/\[ExtractAudio\] Destination: (.+)/` — Conversion started, sent as `"Converting to MP3..."`

#### Streaming Protocol

The response uses `Transfer-Encoding: chunked` with `Content-Type: text/plain`. Each chunk is a JSON object followed by a newline (NDJSON format):

```json
{"type":"progress","message":"Fetching video info..."}
{"type":"progress","message":"Found: Video Title (3:45)"}
{"type":"progress","message":"Extracting audio in best quality..."}
{"type":"progress","message":"Downloading... 45.2%"}
{"type":"progress","message":"Converting to MP3..."}
{"type":"done","data":{"id":"uuid","title":"Video Title","duration":"3:45","filename":"Video Title.mp3"}}
```

Or on error:

```json
{"type":"error","message":"Failed to fetch video info. Check the URL and try again."}
```

### Download Endpoint (`src/app/api/download/route.ts`)

**Method:** `GET`

Serves the extracted MP3 file as a download.

**Query parameters:** `id` (job UUID) and `filename` (MP3 filename)

**Security measures:**

- Rejects requests missing `id` or `filename`
- Rejects parameters containing `..` or `/` (path traversal prevention)
- Verifies the file exists before attempting to stream
- Constructs the file path as `tmp/{id}/{filename}` — only files within known job directories are accessible

**Response:**

- Streams the file using `fs.createReadStream()` converted to a web `ReadableStream`
- Sets `Content-Type: audio/mpeg`
- Sets `Content-Disposition: attachment` for browser download
- Includes `Content-Length` for download progress
- Sets `Cache-Control: private, max-age=3600` (1 hour cache)

## File Storage

Extracted files are stored in a `tmp/` directory at the project root:

```
tmp/
└── {jobId}/          # UUID-named directory per extraction job
    └── {title}.mp3   # The extracted MP3 file
```

- The `tmp/` directory is created automatically if it doesn't exist
- Each job gets an isolated directory named with a `crypto.randomUUID()`
- Files persist until manually cleaned up — there is no automatic cleanup
- The `tmp/` directory is gitignored

## Styling Architecture

### CSS Variables (`src/app/globals.css`)

The design system is built on CSS custom properties defined on `:root`:

| Variable           | Value     | Usage                        |
| ------------------ | --------- | ---------------------------- |
| `--bg`             | `#09090b` | Primary background           |
| `--bg-secondary`   | `#18181b` | Card backgrounds             |
| `--bg-tertiary`    | `#27272a` | Icon containers              |
| `--border`         | `#3f3f46` | Borders and dividers         |
| `--text`           | `#fafafa` | Primary text                 |
| `--text-secondary` | `#a1a1aa` | Muted/secondary text         |
| `--accent`         | `#f4f4f5` | Accent elements              |
| `--accent-dim`     | `#52525b` | Dimmed accent text           |

These are the zinc scale from Tailwind, applied as a dark-first design. The `color-scheme: dark` declaration on `<html>` ensures native form elements match.

### Tailwind CSS 4

Tailwind is imported via `@import "tailwindcss"` in `globals.css` and processed through PostCSS with the `@tailwindcss/postcss` plugin. Component styles use Tailwind utility classes directly in JSX.

## Security Considerations

- **Path traversal prevention**: The download endpoint rejects `..` and `/` in parameters
- **URL validation**: The extract endpoint validates the URL format before processing
- **Process isolation**: Each extraction job gets its own UUID-named directory
- **No user uploads**: The server only writes files produced by yt-dlp
- **Input sanitization**: Request bodies are validated before use

## Known Limitations

- **No automatic cleanup**: Extracted files persist in `tmp/` indefinitely
- **No rate limiting**: The API has no built-in rate limiting
- **No authentication**: The application is open to anyone who can access it
- **Single server**: No horizontal scaling — extraction runs on the same server as the web app
- **No queue**: Extraction jobs run immediately and concurrently with no limit
