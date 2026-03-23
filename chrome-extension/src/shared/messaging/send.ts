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
