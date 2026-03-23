# Security and Secrets

## Secrets
- Never hardcode secrets, API keys, or credentials in source code
- Never read, print, or log the contents of `.env` or `.env.*` files
- Environment variables are only used for binary paths and retention config — keep it that way
- Extension code must not contain embedded secrets

## URL validation
- All incoming URLs must be validated with `new URL()` before use
- Do not skip this validation or weaken it
- Do not follow redirects or fetch arbitrary URLs server-side (SSRF risk)

## Path traversal
- Download route checks `id` and `filename` for `..`, `/`, and `\` — preserve these guards
- File paths are always constructed with `path.join(TMP_DIR, id, filename)` — never with string concatenation
- Do not trust filenames from yt-dlp output without sanitization (`sanitizeFilename()`)
- Do not expose the absolute file path in responses

## Child process safety
- Use `spawn()` with argument arrays — never `exec()` with template strings
- User-provided URLs go as positional arguments, not shell-interpolated
- Sanitize any value that becomes part of a filename or path
- Do not pass user input as part of `--output` template strings beyond what yt-dlp handles

## Error messages
- Return user-friendly error messages, not raw stderr or stack traces
- Strip `ERROR:` prefixes from yt-dlp output before sending to client
- Do not leak internal paths, binary locations, or environment details in responses

## Temp files
- Job directories use `crypto.randomUUID()` for unpredictable IDs
- Failed jobs clean up their directory immediately
- Successful jobs are retained and pruned opportunistically
- Do not serve files outside of `tmp/` through the download route

## Logging
- Do not add logging that prints URLs, filenames, or job IDs to stdout in production
- Keep error logging minimal and free of user-supplied data where possible
