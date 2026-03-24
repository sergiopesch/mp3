/**
 * Backend extraction client for the self-hosted mp3 app.
 */

const DEFAULT_API_URL = 'http://localhost:3000/api/extract';

export interface ExtractResponse {
  downloadUrl: string;
  filename: string;
}

export interface ExtractErrorResponse {
  error: string;
}

export interface MetadataResponse {
  title: string;
  durationSeconds: number;
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

async function getApiEndpoint(): Promise<string> {
  const { settings } = await chrome.storage.local.get({
    settings: { apiEndpoint: DEFAULT_API_URL },
  });
  return settings?.apiEndpoint || DEFAULT_API_URL;
}

export async function fetchMetadata(url: string): Promise<MetadataResponse | ExtractErrorResponse> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
    return { error: 'Invalid URL' };
  }

  try {
    const apiEndpoint = await getApiEndpoint();
    const metadataUrl = apiEndpoint.replace(/\/api\/extract\/?$/, '/api/metadata');

    const response = await fetch(metadataUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmedUrl }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data?.error || 'Failed to fetch metadata' };
    }

    return { title: data.title, durationSeconds: data.durationSeconds };
  } catch {
    return { error: 'Failed to connect to backend' };
  }
}

export interface ExtractOptions {
  url: string;
  startTime?: number;
  endTime?: number;
}

export async function extractAudio(options: ExtractOptions): Promise<BackendResponse> {
  const trimmedUrl = options.url.trim();
  if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
    return { error: 'Invalid URL' };
  }

  try {
    const apiEndpoint = await getApiEndpoint();

    const body: Record<string, unknown> = { url: trimmedUrl };
    if (options.startTime !== undefined) body.startTime = options.startTime;
    if (options.endTime !== undefined) body.endTime = options.endTime;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
