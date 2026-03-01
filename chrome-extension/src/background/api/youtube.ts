/**
 * YouTube Audio Extractor - Standalone (No Server Required!)
 *
 * Uses YouTube's watch page to extract audio streams.
 * This method scrapes the initial player data from the page.
 */

interface YouTubeFormat {
  itag: number;
  url: string;
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
  // Filter for audio-only formats (usually itag 140, 139, 251, etc.)
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
 * Extract player response from YouTube watch page HTML
 */
function extractPlayerResponse(html: string): any {
  // Try multiple patterns to find ytInitialPlayerResponse
  const patterns = [
    /var ytInitialPlayerResponse\s*=\s*({.+?});/,
    /ytInitialPlayerResponse\s*=\s*({.+?});/,
    /var ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}

/**
 * Extract audio from a YouTube URL
 */
export async function extractYouTubeAudio(url: string): Promise<YouTubeResponse> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return { error: 'Invalid YouTube URL' };
  }

  try {
    // Fetch the watch page directly
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      return { error: 'Failed to fetch video page' };
    }

    const html = await response.text();

    // Extract player response from the page
    const playerResponse = extractPlayerResponse(html);

    if (!playerResponse) {
      return { error: 'Could not extract player data from page' };
    }

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
      return { error: 'No audio stream found' };
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
