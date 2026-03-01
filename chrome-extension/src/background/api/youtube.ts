/**
 * YouTube Audio Extractor
 *
 * Primary method: Extract player data via content script (from already-loaded page)
 * Fallback: Direct fetch of watch page (less reliable due to bot detection)
 */

interface YouTubeFormat {
  itag: number;
  url?: string;
  signatureCipher?: string;
  mimeType: string;
  bitrate: number;
  audioQuality?: string;
  audioSampleRate?: string;
  contentLength?: string;
}

export interface YouTubeAudioResult {
  downloadUrl: string;
  filename: string;
  title: string;
}

export interface YouTubeError {
  error: string;
}

export type YouTubeResponse = YouTubeAudioResult | YouTubeError;

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get the best audio format from available formats
 */
function getBestAudioFormat(formats: YouTubeFormat[]): YouTubeFormat | null {
  // Filter for audio-only formats with direct URLs (not signature-ciphered)
  const audioFormats = formats.filter(f =>
    f.mimeType?.includes('audio') && f.url
  );

  if (audioFormats.length === 0) {
    return null;
  }

  // Sort by bitrate (highest first)
  audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  return audioFormats[0];
}

/**
 * Process player response data into an audio result
 */
function processPlayerResponse(playerResponse: any): YouTubeResponse {
  // Check playability
  if (playerResponse.playabilityStatus?.status !== 'OK') {
    const reason = playerResponse.playabilityStatus?.reason || 'Video unavailable';
    return { error: reason };
  }

  // Get streaming data
  const streamingData = playerResponse.streamingData;

  if (!streamingData) {
    return { error: 'No streaming data available' };
  }

  // Combine all formats
  const allFormats = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptiveFormats || [])
  ];

  // Get best audio format
  const audioFormat = getBestAudioFormat(allFormats);

  if (!audioFormat || !audioFormat.url) {
    return { error: 'No audio stream found. The video may require signature decryption which is not supported.' };
  }

  // Get video details
  const videoDetails = playerResponse.videoDetails || {};
  const title = videoDetails.title || 'youtube_audio';
  const author = videoDetails.author || 'Unknown';

  // Create safe filename
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${safeTitle}.mp3`;

  return {
    downloadUrl: audioFormat.url,
    filename,
    title: `${title} - ${author}`
  };
}

/**
 * Try to extract audio using content script (preferred method).
 * This works when the user is on a YouTube page.
 */
async function extractViaContentScript(videoId: string): Promise<YouTubeResponse | null> {
  try {
    // Find the tab with this YouTube video
    const tabs = await chrome.tabs.query({ url: '*://www.youtube.com/*' });
    const matchingTab = tabs.find(tab =>
      tab.url?.includes(videoId) && tab.id !== undefined
    );

    if (!matchingTab || matchingTab.id === undefined) {
      return null; // No matching tab found, will fallback
    }

    // Ask content script to extract player data
    const response = await chrome.tabs.sendMessage(matchingTab.id, {
      type: 'EXTRACT_YOUTUBE_DATA'
    });

    if (response?.playerData) {
      return processPlayerResponse(response.playerData);
    }

    return null; // No data from content script
  } catch {
    return null; // Content script not available
  }
}

/**
 * Extract player response from YouTube watch page HTML (fallback method)
 */
function extractPlayerResponseFromHtml(html: string): any {
  const patterns = [
    /var ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Fallback: fetch the watch page directly (less reliable)
 */
async function extractViaDirectFetch(videoId: string): Promise<YouTubeResponse> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const response = await fetch(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!response.ok) {
    return { error: 'Failed to fetch video page' };
  }

  const html = await response.text();
  const playerResponse = extractPlayerResponseFromHtml(html);

  if (!playerResponse) {
    return { error: 'Could not extract player data. YouTube may be blocking the request. Try opening the video in a tab first.' };
  }

  return processPlayerResponse(playerResponse);
}

/**
 * Extract audio from a YouTube URL.
 * Tries content script first (reliable), falls back to direct fetch.
 */
export async function extractYouTubeAudio(url: string): Promise<YouTubeResponse> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return { error: 'Invalid YouTube URL' };
  }

  try {
    // Method 1: Try content script extraction (works when on a YouTube page)
    console.log('Trying content script extraction...');
    const contentScriptResult = await extractViaContentScript(videoId);
    if (contentScriptResult) {
      if ('downloadUrl' in contentScriptResult) {
        console.log('Content script extraction succeeded');
        return contentScriptResult;
      }
      // If content script returned an error, log it but still try fallback
      console.log('Content script returned error:', (contentScriptResult as YouTubeError).error);
    }

    // Method 2: Fallback to direct fetch
    console.log('Falling back to direct fetch...');
    return await extractViaDirectFetch(videoId);
  } catch (error) {
    console.error('YouTube extraction error:', error);
    return { error: 'Failed to extract audio from YouTube' };
  }
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}
