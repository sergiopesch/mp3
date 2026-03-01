/**
 * Download audio message handler
 */

import { DownloadAudioRequest, DownloadAudioResponse } from '../../shared/types/messages';

export async function handleDownloadAudio(
  message: DownloadAudioRequest,
  _sender: chrome.runtime.MessageSender
): Promise<DownloadAudioResponse> {
  const { downloadUrl, filename } = message;

  try {
    const downloadId = await chrome.downloads.download({
      url: downloadUrl,
      filename,
      saveAs: true, // Show save dialog
    });

    return {
      success: true,
      downloadId,
    };
  } catch (error) {
    console.error('Download failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}
