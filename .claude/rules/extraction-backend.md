# Extraction Backend

Applies to: `src/app/api/extract/route.ts`, `src/app/api/download/route.ts`

## Two-stage extraction
1. **Metadata pass**: `yt-dlp --no-playlist --print %(title)s --print %(duration)s <url>`
2. **Extraction pass**: `yt-dlp --no-playlist --extract-audio --audio-format mp3 --audio-quality 0 --embed-metadata --embed-thumbnail --progress-template "download:%(progress._percent_str)s" -o <template> <url>`

Do not collapse these into a single pass — the metadata is needed for progress messages before extraction starts.

## Binary discovery
- `YT_DLP_BIN` env var, falling back to `~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp`
- `FFMPEG_BIN` env var, falling back to `/usr/bin/ffmpeg`
- `FFMPEG_LOCATION` is passed in the child process env so yt-dlp can locate ffmpeg
- `PATH` is extended to include the yt-dlp directory and the project `.venv/bin`
- Binary availability is checked with `fs.access()` before starting extraction
- Do not hardcode other machine-specific paths

## Child process safety
- Always use `spawn()` with argument arrays — never pass user input through a shell string
- The URL is passed as a positional argument to yt-dlp, not interpolated into a command string
- Kill child processes with `SIGTERM` on abort or failure
- Listen for the `abort` signal on the request to clean up long-running processes

## File handling
- Job directory: `tmp/<crypto.randomUUID()>/`
- Output template: `%(title).120B [%(id)s].%(ext)s` — title truncated to 120 bytes, media ID appended
- After extraction, the MP3 file is renamed with `sanitizeFilename()` (strips special chars, limits to 120 chars)
- The download route joins `TMP_DIR + id + filename` and checks for `..`, `/`, `\` in both params

## Cleanup
- `cleanupOldJobs()` runs opportunistically on each new extraction request (fire-and-forget via `void`)
- Jobs older than `EXTRACT_RETENTION_HOURS` (default 24h) are removed based on directory mtime
- Failed extractions clean up their job directory immediately
- Do not change cleanup to be synchronous or blocking on the request path

## Progress streaming
- Progress lines include download percentage (parsed from `--progress-template` output)
- Conversion detection is based on `[ExtractAudio]` in stdout
- Duplicate percentages are suppressed (only sent when value changes)
- Do not silently degrade streaming into a blocking response
- Do not buffer all output and send it at the end

## Download route
- Validates `id` and `filename` are present and do not contain `..`, `/`, or `\`
- Checks that the resolved path is a file (not a directory)
- Streams the file using `createReadStream()`
- Sets `Content-Disposition: attachment` with URL-encoded filename
- Returns 404 for missing files without leaking the file path
