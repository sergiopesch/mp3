/**
 * Cobalt API client for audio extraction
 * Migrated from /workspace/group/mp3/src/app/api/extract/route.ts
 */

const COBALT_API_URL = 'https://api.cobalt.tools/';

export interface CobaltRequest {
  url: string;
  downloadMode?: 'audio' | 'auto' | 'mute';
  audioFormat?: 'best' | 'mp3' | 'wav' | 'ogg' | 'opus';
  audioBitrate?: '320' | '256' | '128' | '96' | '64' | '8';
}

export interface CobaltSuccessResponse {
  downloadUrl: string;
  filename: string;
}

export interface CobaltErrorResponse {
  error: string;
}

export type CobaltResponse = CobaltSuccessResponse | CobaltErrorResponse;

/**
 * Validate URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract audio from a URL using Cobalt API
 */
export async function extractAudio(
  url: string,
  audioFormat: 'mp3' | 'wav' | 'ogg' = 'mp3',
  audioBitrate: '128' | '256' | '320' = '320'
): Promise<CobaltResponse> {
  // Validate URL
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { error: 'URL is required' };
  }

  if (!isValidUrl(trimmedUrl)) {
    return { error: 'Invalid URL' };
  }

  try {
    // Call Cobalt API
    const response = await fetch(COBALT_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: trimmedUrl,
        downloadMode: 'audio',
        audioFormat,
        audioBitrate,
      } as CobaltRequest),
    });

    if (!response.ok) {
      let errorMsg = 'Processing service returned an error';
      try {
        const data = await response.json();
        if (data.error?.code) {
          errorMsg = data.error.code;
        }
      } catch {
        // Ignore JSON parse errors
      }
      return { error: errorMsg };
    }

    const data = await response.json();

    // Handle error status
    if (data.status === 'error') {
      return {
        error: data.error?.code || 'Failed to process this URL'
      };
    }

    // Handle tunnel/redirect status (direct download URL)
    if (data.status === 'tunnel' || data.status === 'redirect') {
      return {
        downloadUrl: data.url,
        filename: data.filename || 'audio.mp3',
      };
    }

    // Handle picker status (multiple options available)
    if (data.status === 'picker') {
      // Try to get audio directly
      if (data.audio) {
        return {
          downloadUrl: data.audio,
          filename: data.audioFilename || 'audio.mp3',
        };
      }

      // Fallback to first picker option
      const first = data.picker?.[0];
      if (first?.url) {
        return {
          downloadUrl: first.url,
          filename: 'audio.mp3',
        };
      }
    }

    return { error: 'Could not extract audio from this URL' };
  } catch (error) {
    console.error('Cobalt API error:', error);
    return { error: 'Failed to connect to processing service' };
  }
}
