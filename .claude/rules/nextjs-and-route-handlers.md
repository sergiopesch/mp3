# Next.js and Route Handlers

Applies to: `src/app/**`

## App Router conventions
- Server components by default; `"use client"` only when the component uses browser APIs, state, or effects
- API routes live in `src/app/api/{name}/route.ts` and export named HTTP method handlers
- Return Web API `Response` objects from route handlers
- `page.tsx` is currently the only client component

## Runtime
- Both route handlers (`extract` and `download`) use `export const runtime = "nodejs"`
- This is required because they use `child_process.spawn()`, `fs`, and `path`
- Never change these to edge runtime — local process execution will fail
- `maxDuration` is set to 300 (extract) and 60 (download) — respect these

## Route handler expectations
- Validate all input at the top of the handler before doing any work
- Return structured JSON errors with appropriate HTTP status codes before the stream starts
- Once streaming begins, errors go through the NDJSON `{"type":"error"}` message
- Do not mix JSON error responses with streaming in the same response
- Keep route handlers self-contained — the project intentionally has no middleware or shared utilities

## Streaming
- `POST /api/extract` returns a `ReadableStream` of NDJSON lines
- Content-Type is `text/plain; charset=utf-8` with `Cache-Control: no-store`
- Do not change this to SSE, WebSocket, or any other protocol without explicit request
- The stream contract (progress/done/error message types) is consumed by both the web UI and the Chrome extension

## Do not
- Add middleware unless explicitly asked
- Move route handlers to a different path structure
- Add API authentication unless explicitly asked (this is a self-hosted tool)
- Import server-only modules (`child_process`, `fs`) in client components
