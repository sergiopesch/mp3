# UI and Progress Streaming

Applies to: `src/app/page.tsx`

## State machine
The UI has six explicit states: `idle`, `loading-meta`, `preview`, `extracting`, `done`, `error`. Keep these distinct.

- `idle` — URL input + "Get Info" button + supported platforms list
- `loading-meta` — spinner while fetching metadata from `/api/metadata`
- `preview` — title, duration, dual range slider, "Extract" button (full or section)
- `extracting` — spinner + progress message (updated via stream)
- `done` — result card (title, filename, duration) + Download MP3 button + Extract another
- `error` — error message + Try again button

Do not introduce ambiguous intermediate states or collapse states together.

## Metadata preview
- Clicking "Get Info" calls `POST /api/metadata` with the URL
- Response includes `title` and `durationSeconds`
- The preview shows a dual-handle range slider for time selection
- Default range is full clip (start=0, end=durationSeconds)
- User can drag handles to select a section
- Changing the URL resets back to idle state

## Time range
- `rangeStart` and `rangeEnd` are tracked in state (seconds)
- When the range covers the full clip, the button says "Extract Full Audio"
- When a subsection is selected, the button says "Extract X:XX Section"
- The range values are sent as `startTime`/`endTime` in the extract request body
- Full clip extractions omit these fields for backwards compatibility

## Progress streaming
- The frontend reads the NDJSON stream via `fetch().body.getReader()`
- Lines are split on `\n`, parsed as JSON, and dispatched by `type`
- `metadata` messages are received but not used (preview already has the info)
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
- Range slider uses overlapping `<input type="range">` elements with CSS for thumb styling
- Favour simple, sturdy UI over animation or decorative complexity
- Keep the layout centred, responsive, and minimal
