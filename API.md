# API Reference

The app exposes two Next.js route handlers:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/extract` | Start a local extraction job using `yt-dlp` + `ffmpeg`, streaming progress as NDJSON |
| `GET` | `/api/download` | Download the extracted MP3 file from local temporary storage |

## POST /api/extract

Request body:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### Success response

This endpoint returns a streaming response (`text/plain; charset=utf-8`) where each line is a JSON object.

Message types:

#### Progress

```json
{"type":"progress","message":"Checking source..."}
```

```json
{"type":"progress","message":"Found: Never Gonna Give You Up (3:33)"}
```

```json
{"type":"progress","message":"Downloading... 47.1%"}
```

```json
{"type":"progress","message":"Converting to MP3..."}
```

#### Done

```json
{
  "type": "done",
  "data": {
    "id": "job-uuid",
    "title": "Never Gonna Give You Up",
    "duration": "3:33",
    "filename": "Never Gonna Give You Up [dQw4w9WgXcQ].mp3",
    "downloadPath": "/api/download?id=job-uuid&filename=Never%20Gonna%20Give%20You%20Up%20%5BdQw4w9WgXcQ%5D.mp3"
  }
}
```

#### Error

```json
{"type":"error","message":"Video unavailable"}
```

### Error responses before streaming starts

- `400` — invalid JSON body
- `400` — missing or invalid URL
- `500` — local extractor dependencies missing

## GET /api/download

Query parameters:

- `id` — extraction job id
- `filename` — extracted MP3 filename

Example:

```text
/api/download?id=job-uuid&filename=Never%20Gonna%20Give%20You%20Up%20%5BdQw4w9WgXcQ%5D.mp3
```

### Success

Returns the MP3 file with:

- `Content-Type: audio/mpeg`
- `Content-Disposition: attachment`
- `Cache-Control: private, max-age=3600`

### Errors

- `400` — missing parameters
- `400` — invalid path-like parameters
- `404` — file not found

## Operational notes

- `/api/extract` requires the Node runtime and local access to `yt-dlp` and `ffmpeg`.
- Extracted files are stored in `tmp/`.
- Completed jobs are cleaned up opportunistically on future requests based on `EXTRACT_RETENTION_HOURS`.
