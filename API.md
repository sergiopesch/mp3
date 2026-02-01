# API Reference

The mp3 application exposes two HTTP API endpoints, both implemented as Next.js Route Handlers in the `src/app/api/` directory.

## Endpoints

| Method | Path             | Description                        |
| ------ | ---------------- | ---------------------------------- |
| POST   | `/api/extract`   | Extract audio from a video URL     |
| GET    | `/api/download`  | Download an extracted MP3 file     |

---

## POST /api/extract

Extracts audio from the given video URL and converts it to MP3. Returns a streaming response with real-time progress updates.

**Source:** `src/app/api/extract/route.ts`

### Request

```http
POST /api/extract
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
}
```

| Field | Type   | Required | Description                  |
| ----- | ------ | -------- | ---------------------------- |
| `url` | string | Yes      | The video URL to extract from |

### Response

**Success — streaming (200)**

The response is a stream of newline-delimited JSON objects (`Content-Type: text/plain; charset=utf-8`). Each line is a complete JSON object.

There are three message types:

#### Progress Message

Sent multiple times during extraction to report status.

```json
{"type": "progress", "message": "Fetching video info..."}
```

```json
{"type": "progress", "message": "Found: Never Gonna Give You Up (3:33)"}
```

```json
{"type": "progress", "message": "Extracting audio in best quality..."}
```

```json
{"type": "progress", "message": "Downloading... 45.2%"}
```

```json
{"type": "progress", "message": "Converting to MP3..."}
```

| Field     | Type   | Description            |
| --------- | ------ | ---------------------- |
| `type`    | string | Always `"progress"`    |
| `message` | string | Human-readable status  |

#### Done Message

Sent once when extraction completes successfully. This is always the last message in the stream.

```json
{
  "type": "done",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Never Gonna Give You Up",
    "duration": "3:33",
    "filename": "Never Gonna Give You Up.mp3"
  }
}
```

| Field            | Type   | Description                                 |
| ---------------- | ------ | ------------------------------------------- |
| `type`           | string | Always `"done"`                             |
| `data.id`        | string | Job UUID — used to download the file        |
| `data.title`     | string | Video title                                 |
| `data.duration`  | string | Duration in `M:SS` format                   |
| `data.filename`  | string | Output filename (the MP3 file on disk)      |

#### Error Message

Sent if extraction fails at any point. This is always the last message in the stream.

```json
{"type": "error", "message": "Failed to fetch video info. Check the URL and try again."}
```

| Field     | Type   | Description              |
| --------- | ------ | ------------------------ |
| `type`    | string | Always `"error"`         |
| `message` | string | Human-readable error     |

### Error Responses

**Invalid request body (400)**

```json
{"error": "Invalid request body"}
```

**Missing URL (400)**

```json
{"error": "URL is required"}
```

**Invalid URL format (400)**

```json
{"error": "Invalid URL"}
```

### Progress Sequence

A typical successful extraction follows this message sequence:

```
1. {"type":"progress","message":"Fetching video info..."}
2. {"type":"progress","message":"Found: <title> (<duration>)"}
3. {"type":"progress","message":"Extracting audio in best quality..."}
4. {"type":"progress","message":"Downloading... 0.0%"}
   ... (repeated with increasing percentages)
5. {"type":"progress","message":"Downloading... 100%"}
6. {"type":"progress","message":"Converting to MP3..."}
7. {"type":"done","data":{...}}
```

### Example Usage

**JavaScript (browser):**

```javascript
const res = await fetch("/api/extract", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://youtube.com/watch?v=..." }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line);

    switch (msg.type) {
      case "progress":
        console.log("Progress:", msg.message);
        break;
      case "done":
        console.log("Complete:", msg.data);
        break;
      case "error":
        console.error("Error:", msg.message);
        break;
    }
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}' \
  --no-buffer
```

---

## GET /api/download

Downloads a previously extracted MP3 file.

**Source:** `src/app/api/download/route.ts`

### Request

```http
GET /api/download?id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&filename=Never%20Gonna%20Give%20You%20Up.mp3
```

| Parameter  | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `id`       | string | Yes      | Job UUID from the extract response   |
| `filename` | string | Yes      | Filename from the extract response   |

### Response

**Success (200)**

Returns the MP3 file as a binary download.

| Header              | Value                                          |
| ------------------- | ---------------------------------------------- |
| `Content-Type`      | `audio/mpeg`                                   |
| `Content-Length`     | File size in bytes                             |
| `Content-Disposition` | `attachment; filename="<url-encoded-name>"`  |
| `Cache-Control`     | `private, max-age=3600`                        |

### Error Responses

**Missing parameters (400)**

```json
{"error": "Missing id or filename"}
```

**Invalid parameters — path traversal attempt (400)**

```json
{"error": "Invalid parameters"}
```

Triggered when `id` or `filename` contains `..` or `/`.

**File not found (404)**

```json
{"error": "File not found"}
```

The job may have been cleaned up or the parameters are incorrect.

### Example Usage

**Browser:**

```javascript
// Using the result from /api/extract
window.open(
  `/api/download?id=${result.id}&filename=${encodeURIComponent(result.filename)}`,
  "_blank"
);
```

**cURL:**

```bash
curl -o output.mp3 \
  "http://localhost:3000/api/download?id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&filename=Never%20Gonna%20Give%20You%20Up.mp3"
```

---

## Data Types

### JobResult

Returned inside the `done` message from the extract endpoint.

```typescript
interface JobResult {
  id: string;       // UUID identifying the extraction job
  title: string;    // Video title
  duration: string; // Duration in "M:SS" format
  filename: string; // MP3 filename on disk
}
```

### Status

Client-side state machine type (not part of the API, but useful context).

```typescript
type Status = "idle" | "extracting" | "done" | "error";
```

---

## Notes

- The extract endpoint uses `Transfer-Encoding: chunked` to stream responses. Clients must handle the response as a stream, not wait for the full body.
- The download endpoint serves files from `tmp/{id}/{filename}`. Files are not automatically cleaned up and will persist until removed manually.
- Both endpoints run on the Next.js server — there is no separate backend service.
- Extraction spawns two sequential `yt-dlp` processes (info retrieval, then audio download). The total time depends on the video length and network speed.
