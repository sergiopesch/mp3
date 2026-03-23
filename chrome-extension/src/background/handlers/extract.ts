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

  const result = await extractAudio(url);

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

  const settings = await SettingsManager.getSettings();
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
