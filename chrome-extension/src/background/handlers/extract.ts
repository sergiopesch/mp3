/**
 * Extract audio message handler
 */

import { extractAudio } from '../api/cobalt';
import { HistoryManager } from '../storage/history';
import { SettingsManager } from '../storage/settings';
import { ExtractAudioRequest, ExtractAudioResponse } from '../../shared/types/messages';

export async function handleExtractAudio(
  message: ExtractAudioRequest,
  _sender: chrome.runtime.MessageSender
): Promise<ExtractAudioResponse> {
  const { url } = message;

  // Get current settings
  const settings = await SettingsManager.getSettings();

  // Extract audio using Cobalt API
  const result = await extractAudio(
    url,
    settings.audioFormat,
    settings.audioBitrate
  );

  // Handle error response
  if ('error' in result) {
    // Add to history with error status
    await HistoryManager.addHistoryItem({
      url,
      filename: '',
      downloadUrl: '',
      status: 'error',
      error: result.error,
    });

    return {
      success: false,
      error: result.error,
    };
  }

  // Add to history with success status
  await HistoryManager.addHistoryItem({
    url,
    filename: result.filename,
    downloadUrl: result.downloadUrl,
    status: 'success',
  });

  // Auto-download if enabled
  if (settings.autoDownload) {
    try {
      await chrome.downloads.download({
        url: result.downloadUrl,
        filename: result.filename,
        saveAs: false,
      });
    } catch (error) {
      console.error('Auto-download failed:', error);
      // Don't fail the extraction if download fails
    }
  }

  return {
    success: true,
    downloadUrl: result.downloadUrl,
    filename: result.filename,
  };
}
