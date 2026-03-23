Review the current branch diff for issues specific to this project.

Run `git diff HEAD~1` (or `git diff main` if on a feature branch) and analyse the changes for:

1. **Route handler correctness**: Are `runtime`, `maxDuration`, input validation, and response structure preserved? Are Web API `Response` objects used correctly?

2. **Security issues**: Path traversal risks in download params, unsanitized filenames, shell injection via child process args, secret exposure, SSRF patterns, error messages leaking internal details.

3. **Extraction flow regressions**: Is the two-stage metadata+extraction flow preserved? Are yt-dlp arguments correct? Is binary discovery intact? Are child processes killed on abort?

4. **NDJSON streaming regressions**: Is the stream contract (progress/done/error types) preserved? Are both consumers (web UI in `src/app/page.tsx` and extension in `chrome-extension/src/background/api/cobalt.ts`) still compatible with the message shape?

5. **File handling**: Are filenames sanitized? Is `path.join()` used (not string concatenation)? Are path traversal guards in the download route intact? Is cleanup behaviour preserved?

6. **Extension/backend contract**: Does the extension still match the backend's API shape? Is `buildAbsoluteDownloadUrl()` still correct? Are settings types aligned?

7. **UI regressions**: Are all four states (idle/extracting/done/error) still reachable and correct? Is the download button working? Is progress displayed during extraction?

Provide a concise summary of findings, grouped by category. Flag anything that looks like a regression or security issue.
