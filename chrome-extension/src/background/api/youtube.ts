/**
 * YouTube Audio Extractor - Standalone (No Server Required!)
 *
 * This module extracts audio from YouTube videos using YouTube's public
 * video info endpoint. Works entirely in the browser.
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

interface YouTubeVideoInfo {
  formats: YouTubeFormat[];
  adaptiveFormats: YouTubeFormat[];
  title: string;
  author: string;
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
  // Filter for audio-only formats
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
 * Extract audio from a YouTube URL
 */
export async function extractYouTubeAudio(url: string): Promise<YouTubeResponse> {
  // Extract video ID
  const videoId = extractVideoId(url);

  if (!videoId) {
    return { error: 'Invalid YouTube URL' };
  }

  try {
    // Method 1: Try using YouTube's embed page to get video info
    // This endpoint is public and doesn't require authentication
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    const embedResponse = await fetch(embedUrl);
    const embedHtml = await embedResponse.text();

    // Extract ytInitialPlayerResponse from the embed page
    const match = embedHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);

    if (!match || !match[1]) {
      return { error: 'Could not fetch video information' };
    }

    const playerResponse = JSON.parse(match[1]);

    // Check if video is available
    if (playerResponse.playabilityStatus?.status !== 'OK') {
      const reason = playerResponse.playabilityStatus?.reason || 'Video unavailable';
      return { error: reason };
    }

    // Get streaming data
    const streamingData = playerResponse.streamingData;

    if (!streamingData) {
      return { error: 'No streaming data available' };
    }

    // Combine formats and adaptive formats
    const allFormats = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptiveFormats || [])
    ];

    // Get the best audio format
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
