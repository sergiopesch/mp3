/**
 * Extract audio message handler
 */

import { extractAudio } from '../api/cobalt';
import { ensureBackendRunning } from '../api/backend-launcher';
import { HistoryManager } from '../storage/history';
import { SettingsManager } from '../storage/settings';
import { ExtractAudioRequest, ExtractAudioResponse } from '../../shared/types/messages';
import { DEFAULT_SETTINGS } from '../../shared/types/storage';

export async function handleExtractAudio(
  message: ExtractAudioRequest,
  _sender: chrome.runtime.MessageSender
): Promise<ExtractAudioResponse> {
  const { url, startTime, endTime } = message;

  // Ensure the backend is running before extraction
  const settings = await SettingsManager.getSettings();
  const apiEndpoint = settings.apiEndpoint || DEFAULT_SETTINGS.apiEndpoint;
  const backend = await ensureBackendRunning(apiEndpoint);
  if (!backend.ok) {
    return { success: false, error: backend.message || 'Backend is not running' };
  }

  const result = await extractAudio({ url, startTime, endTime });

  if ('error' in result) {
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

  await HistoryManager.addHistoryItem({
    url,
    filename: result.filename,
    downloadUrl: result.downloadUrl,
    status: 'success',
  });

  if (settings.autoDownload) {
    try {
      await chrome.downloads.download({
        url: result.downloadUrl,
        filename: result.filename,
        saveAs: false,
      });
    } catch (error) {
      console.error('Auto-download failed:', error);
    }
  }

  return {
    success: true,
    downloadUrl: result.downloadUrl,
    filename: result.filename,
  };
}
