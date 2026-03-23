# Code Style

- Preserve existing style — do not reformat code you did not change
- TypeScript strict mode is on; do not weaken it
- Use the `@/*` path alias for imports from `src/`
- Prefer small, explicit, typed functions over large inline blocks
- Keep naming clear: `jobId`, `jobDir`, `mp3File` — not `j`, `d`, `f`
- Do not add abstraction layers, utility modules, or helpers unless explicitly asked
- Do not refactor surrounding code when fixing a bug or adding a feature
- Keep server logic (route handlers, child processes) and UI concerns (React state, JSX) in separate files
- Tailwind v4 in the web app (`@import "tailwindcss"`), Tailwind v3 in the extension (classic config)
- CSS variables are defined in `src/app/globals.css` — reference with `var(--name)` in bracket syntax
- Do not add console.log or noisy logging — the codebase is intentionally quiet
- Use `const` by default; `let` only when reassignment is needed
- Prefer `async/await` over `.then()` chains
