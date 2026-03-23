# UI and Progress Streaming

Applies to: `src/app/page.tsx`

## State machine
The UI has four explicit states: `idle`, `extracting`, `done`, `error`. Keep these distinct.

- `idle` — URL input + Extract button + supported platforms list
- `extracting` — spinner + progress message (updated via stream)
- `done` — result card (title, filename, duration) + Download MP3 button + Extract another
- `error` — error message + Try again button

Do not introduce ambiguous intermediate states or collapse states together.

## Progress streaming
- The frontend reads the NDJSON stream via `fetch().body.getReader()`
- Lines are split on `\n`, parsed as JSON, and dispatched by `type`
- Progress messages update the `progress` state shown below the spinner
- The `done` message sets `result` and transitions to the done state
- An `error` message throws and transitions to the error state
- Do not replace this with polling, WebSocket, or SSE without explicit request

## Error handling
- Errors display the message from the backend — keep them useful but not leaky
- Non-200 responses before streaming are parsed as JSON and the `error` field is shown
- Do not show raw exception objects, stack traces, or "Unknown error" when a real message is available

## Download
- Download is triggered by `window.open(result.downloadPath, "_blank")`
- The download path comes from the `done` stream message and is a relative URL
- Keep the Download MP3 button prominent and obvious

## Design
- Dark theme with CSS variables from `globals.css`
- Tailwind v4 utility classes — use bracket syntax for CSS variables: `text-[var(--text-secondary)]`
- Single-component architecture — do not extract sub-components unless explicitly asked
- Favour simple, sturdy UI over animation or decorative complexity
- Keep the layout centred, responsive, and minimal
