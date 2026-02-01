# Contributing

Guidelines for developing and contributing to the mp3 project.

## Development Setup

### Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)
- **yt-dlp** — install via `pip install yt-dlp`
- **ffmpeg** — install via your system package manager

### Installation

```bash
git clone https://github.com/sergiopesch/mp3.git
cd mp3
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
│   ├── extract/route.ts     Audio extraction API endpoint
│   └── download/route.ts    File download API endpoint
├── layout.tsx               Root layout (server component)
├── page.tsx                 Home page (client component)
└── globals.css              Global styles and CSS variables
```

All source code lives under `src/app/` following the Next.js App Router convention. There are no additional libraries, utilities, or shared modules — the project is intentionally kept small.

## Code Conventions

### TypeScript

- Strict mode is enabled (`"strict": true` in `tsconfig.json`)
- Target is ES2017
- Use the `@/*` path alias for imports from `src/`

### Styling

- Use Tailwind CSS utility classes directly in JSX
- Custom design tokens are defined as CSS variables in `globals.css`
- Reference variables with `var(--name)` inside Tailwind's bracket syntax: `text-[var(--text-secondary)]`

### Components

- The app currently uses a single client component (`page.tsx`). If adding new pages or components, follow the Next.js App Router patterns:
  - Server components by default
  - Add `"use client"` only when the component needs browser APIs, state, or effects
  - Place shared components in `src/components/` (create the directory if needed)

### API Routes

- API routes live in `src/app/api/{name}/route.ts`
- Export named functions matching HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- Return `Response` objects (Web API standard)
- Validate all input before processing

## Key Technical Decisions

### Streaming responses

The extract endpoint uses `ReadableStream` to stream progress updates as newline-delimited JSON. This was chosen over Server-Sent Events (SSE) or WebSockets for simplicity — it works with a standard `fetch()` call and requires no additional libraries.

### System process spawning

`yt-dlp` and `ffmpeg` are invoked via `child_process.spawn()` rather than being wrapped in a library. This keeps the dependency tree minimal and gives full control over CLI arguments.

### Temporary file storage

Extracted files are stored in `tmp/{jobId}/` at the project root. There is currently no automatic cleanup mechanism. If adding one, consider:
- A cron job or scheduled task
- Cleanup on download completion
- TTL-based expiration

### Single-component UI

The entire frontend is one component to keep things simple. If the app grows, consider extracting:
- A `ProgressCard` component for the extraction state
- A `ResultCard` component for the done state
- An `ErrorCard` component for the error state

## Testing

There is no test suite yet. If adding tests:

- Use the testing framework of your choice (Jest, Vitest, or Playwright for E2E)
- Unit test the `formatDuration` helper and URL validation logic
- Integration test the API routes with mocked `yt-dlp` responses
- E2E test the full extraction flow

## Common Development Tasks

### Adding a new API endpoint

1. Create `src/app/api/{name}/route.ts`
2. Export the HTTP method handler (`GET`, `POST`, etc.)
3. Document the endpoint in [API.md](./API.md)

### Modifying the extraction process

The extraction logic is in `src/app/api/extract/route.ts`. Key areas:

- **Lines 57-62**: Phase 1 — yt-dlp metadata retrieval arguments
- **Lines 96-107**: Phase 2 — yt-dlp download and conversion arguments
- **Lines 120-121**: Progress percentage regex parsing
- **Lines 129-131**: Conversion detection regex parsing

### Changing the design

- Color tokens are in `src/app/globals.css` as CSS variables
- Component styles are inline Tailwind classes in `src/app/page.tsx`
- The layout structure is in `src/app/layout.tsx`

## Troubleshooting

### "yt-dlp: command not found"

yt-dlp is not on your `PATH`. Install it with `pip install yt-dlp` and verify with `yt-dlp --version`.

### "ffmpeg not found" errors during extraction

ffmpeg is not on your `PATH`. Install it via your system package manager and verify with `ffmpeg -version`.

### Extraction succeeds but no MP3 file found

This can happen if ffmpeg fails during the audio conversion step. Check the server console for stderr output from the yt-dlp process.

### Port 3000 already in use

Another process is using port 3000. Either stop it or run Next.js on a different port:

```bash
npm run dev -- -p 3001
```
