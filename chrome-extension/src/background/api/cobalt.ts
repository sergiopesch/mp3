/**
 * Backend extraction client for the self-hosted mp3 app.
 *
 * The browser extension now relies on the Next.js backend for durable extraction
 * across supported platforms. The old public Cobalt dependency is gone.
 */

const DEFAULT_API_URL = 'http://localhost:3000/api/extract';

export interface ExtractResponse {
  downloadUrl: string;
  filename: string;
}

export interface ExtractErrorResponse {
  error: string;
}

export type BackendResponse = ExtractResponse | ExtractErrorResponse;

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export async function extractAudio(url: string): Promise<BackendResponse> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { error: 'URL is required' };
  }

  if (!isValidUrl(trimmedUrl)) {
    return { error: 'Invalid URL' };
  }

  try {
    const { settings } = await chrome.storage.local.get({
      settings: {
        apiEndpoint: DEFAULT_API_URL,
      },
    });

    const apiEndpoint = settings?.apiEndpoint || DEFAULT_API_URL;
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: trimmedUrl }),
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => null);
      return { error: data?.error || 'Extraction failed' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: ExtractResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const message = JSON.parse(line);
        if (message.type === 'error') {
          return { error: message.message || 'Extraction failed' };
        }

        if (message.type === 'done' && message.data) {
          finalResult = {
            downloadUrl: buildAbsoluteDownloadUrl(apiEndpoint, message.data.downloadPath),
            filename: message.data.filename,
          };
        }
      }
    }

    if (!finalResult) {
      return { error: 'Extraction finished without a download result' };
    }

    return finalResult;
  } catch (error) {
    console.error('Backend extraction error:', error);
    return { error: 'Failed to connect to extractor backend' };
  }
}

function buildAbsoluteDownloadUrl(apiEndpoint: string, downloadPath: string): string {
  if (/^https?:\/\//i.test(downloadPath)) {
    return downloadPath;
  }

  return new URL(downloadPath, apiEndpoint).toString();
}
