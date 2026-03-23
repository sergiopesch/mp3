# Feature Implementation Skill

Guide for implementing new features in this project safely.

## Before writing code

1. Read the existing implementation files relevant to the feature:
   - `src/app/api/extract/route.ts` — extraction backend
   - `src/app/api/download/route.ts` — file serving
   - `src/app/page.tsx` — web UI
   - `chrome-extension/src/background/api/cobalt.ts` — extension API client
   - `chrome-extension/src/shared/types/` — shared types
   - `ARCHITECTURE.md` and `API.md` — documentation

2. Identify which parts of the system the feature touches:
   - Backend only (route handlers, yt-dlp args, file handling)
   - Frontend only (UI states, progress display, download flow)
   - Extension only (popup, settings, background worker)
   - Cross-cutting (stream contract, API shape, types)

## Implementation rules

### Preserve invariants
- `runtime = "nodejs"` on both route handlers
- NDJSON streaming contract (progress/done/error message types)
- Path traversal guards in download route
- Filename sanitization before disk writes
- `spawn()` with argument arrays for child processes
- Opportunistic non-blocking cleanup

### Keep consumers aligned
- If the stream message shape changes, update both:
  - `src/app/page.tsx`
  - `chrome-extension/src/background/api/cobalt.ts`
- If settings schema changes, update `chrome-extension/src/shared/types/storage.ts`
- If the API contract changes, update `API.md`

### Minimalism
- Make the smallest coherent change that delivers the feature
- Do not refactor surrounding code
- Do not add abstraction layers for a single use case
- Do not add dependencies unless strictly necessary
- Do not change the build system

### Safety
- Validate all new inputs at the boundary (route handler entry point)
- Sanitize any new values that become filenames or paths
- Do not pass new user input through shell strings
- Do not introduce server-side fetching of arbitrary URLs
- Keep error messages useful but free of internal details

## After implementation

1. Run `npm run build` to verify the web app compiles
2. If extension was changed: `cd chrome-extension && npm run build`
3. Update `ARCHITECTURE.md` or `API.md` only if the change meaningfully affects the documented architecture or API
