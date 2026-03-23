Run a pre-ship checklist for this project.

## Steps

### 1. Build check
Run `npm run build` and report any errors.

### 2. Extension build check
Run `cd chrome-extension && npm run build` and report any errors.

### 3. Type check
Run `npx tsc --noEmit` and report any type errors.

### 4. Secret exposure scan
Search the codebase for:
- Hardcoded API keys, tokens, or passwords
- `.env` files accidentally tracked
- Secrets in extension source code

Use: `git diff --cached` and `grep -r` across `src/` and `chrome-extension/src/`.

### 5. Route handler safety
Verify in `src/app/api/extract/route.ts` and `src/app/api/download/route.ts`:
- `runtime = "nodejs"` is set
- Input validation is present at the top of each handler
- Path traversal guards are intact in the download route
- Child process uses `spawn()` with argument arrays (not `exec()`)

### 6. Backend assumptions
Verify:
- Binary paths use env vars with sensible defaults
- `FFMPEG_LOCATION` is passed to child process env
- Cleanup is non-blocking (fire-and-forget)
- Job directories use `crypto.randomUUID()`

### 7. File path and traversal
Verify:
- Download route checks for `..`, `/`, `\` in both `id` and `filename`
- Filenames are sanitized before disk write
- No raw user input is used in `path.join()` without validation

### 8. UI and streaming consistency
Verify in `src/app/page.tsx`:
- All four states (idle/extracting/done/error) are handled
- Stream reader parses NDJSON lines correctly
- Download button uses `result.downloadPath`

### 9. Extension/backend alignment
Verify:
- `chrome-extension/src/background/api/cobalt.ts` parses the same NDJSON stream format
- `chrome-extension/src/shared/types/storage.ts` `Settings.apiEndpoint` matches expected backend path
- `buildAbsoluteDownloadUrl()` correctly resolves relative download paths

Report a pass/fail summary for each check.
