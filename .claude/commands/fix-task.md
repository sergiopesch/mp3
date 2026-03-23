Fix the following task or issue:

$ARGUMENTS

## Process

1. Read and understand the task description above.

2. Inspect the relevant files. The codebase is small — read what you need:
   - Web app: `src/app/page.tsx`, `src/app/api/extract/route.ts`, `src/app/api/download/route.ts`
   - Extension: `chrome-extension/src/background/api/cobalt.ts`, `chrome-extension/src/shared/types/`
   - Docs: `ARCHITECTURE.md`, `API.md`

3. Implement the smallest coherent fix:
   - Do not refactor unrelated code
   - Preserve the NDJSON streaming contract
   - Preserve `runtime = "nodejs"` on route handlers
   - Preserve path traversal guards in the download route
   - Preserve filename sanitization
   - Preserve child process argument safety (no shell interpolation)

4. If the fix changes the stream message shape or API contract, update both consumers:
   - `src/app/page.tsx` (web UI)
   - `chrome-extension/src/background/api/cobalt.ts` (extension)

5. Verify `npm run build` still passes.

6. Only update `ARCHITECTURE.md` or `API.md` if the change meaningfully affects the documented architecture or API contract.
