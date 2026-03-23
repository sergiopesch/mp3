# Security Review Skill

Perform a security-focused review of this codebase. Use read-only tools (Read, Grep, Glob). Do not modify files.

## Scope

Focus on the attack surface specific to this project:

### 1. Path traversal
- Check `src/app/api/download/route.ts` for traversal guards on `id` and `filename` params
- Verify that `..`, `/`, and `\` are rejected
- Verify file paths are constructed with `path.join()` from a fixed base (`TMP_DIR`)
- Check that no other route serves files from disk

### 2. Filename handling
- Check `sanitizeFilename()` in `src/app/api/extract/route.ts`
- Verify it strips dangerous characters and limits length
- Check that yt-dlp output filenames are sanitized before rename

### 3. Child process safety
- Verify `spawn()` is used with argument arrays (not `exec()` with string interpolation)
- Check that user-provided URLs are passed as positional args, not shell-interpolated
- Check that no user input flows into `--output` template beyond yt-dlp's own template variables
- Verify `SIGTERM` is sent on abort

### 4. Secret exposure
- Grep for hardcoded API keys, tokens, passwords, or credentials in `src/` and `chrome-extension/src/`
- Verify `.env` is gitignored
- Check that error responses do not leak env vars, file paths, or binary locations

### 5. URL validation
- Verify all incoming URLs are validated with `new URL()` before use
- Check for SSRF patterns (server-side fetch of user-supplied URLs beyond passing to yt-dlp)

### 6. Extension security
- Check that `chrome-extension/src/` contains no embedded secrets
- Verify the extension reads `apiEndpoint` from settings, not hardcoded
- Check that `buildAbsoluteDownloadUrl()` does not allow open redirect

### 7. Error message leakage
- Check that error responses in both routes strip internal details
- Verify stderr from yt-dlp is cleaned before sending to client

### 8. Local file serving
- Verify the download route only serves files from `tmp/`
- Check for `Content-Disposition: attachment` header
- Verify no directory listing is possible

Report findings as: PASS, WARN, or FAIL for each category, with specific file/line references.
