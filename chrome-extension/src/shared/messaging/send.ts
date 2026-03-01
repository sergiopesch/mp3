/**
 * Helper functions for sending messages to the service worker
 */

import type { Message, MessageResponse } from '../types/messages';

/**
 * Send a message to the service worker and get a response
 */
export async function sendMessage<T extends Message>(
  message: T
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Get the current active tab
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

/**
 * Extract URL from current tab if it's a video platform
 */
export async function getVideoUrlFromTab(): Promise<string | null> {
  const tab = await getActiveTab();
  if (!tab?.url) return null;

  // Check if URL is from a supported video platform
  const videoPatterns = [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /vimeo\.com\//,
    /twitter\.com\/.*\/status/,
    /x\.com\/.*\/status/,
    /tiktok\.com\//,
    /instagram\.com\/(p|reel)\//,
    /facebook\.com\/watch/,
    /twitch\.tv\//,
    /dailymotion\.com\//,
    /soundcloud\.com\//,
  ];

  const isVideoUrl = videoPatterns.some(pattern => pattern.test(tab.url!));
  return isVideoUrl ? tab.url : null;
}
