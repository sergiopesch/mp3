/**
 * Context menu handler
 */

import { extractAudio } from '../api/cobalt';
import { HistoryManager } from '../storage/history';
import { SettingsManager } from '../storage/settings';

const CONTEXT_MENU_ID = 'extract-audio';

/**
 * Setup context menu on extension install
 */
export function setupContextMenu(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Extract Audio',
      contexts: ['link', 'page'],
    });
  });
}

/**
 * Handle context menu clicks
 */
export function handleContextMenuClick(): void {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) {
      return;
    }

    // Get URL from link or page
    const url = info.linkUrl || info.pageUrl;
    if (!url) {
      console.error('No URL found in context menu click');
      return;
    }

    try {
      // Get settings
      const settings = await SettingsManager.getSettings();

      // Extract audio
      const result = await extractAudio(
        url,
        settings.audioFormat,
        settings.audioBitrate
      );

      // Handle error
      if ('error' in result) {
        await HistoryManager.addHistoryItem({
          url,
          filename: '',
          downloadUrl: '',
          status: 'error',
          error: result.error,
        });

        // Show error notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Extraction Failed',
          message: result.error,
        });
        return;
      }

      // Add to history
      await HistoryManager.addHistoryItem({
        url,
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        status: 'success',
      });

      // Auto-download if enabled
      if (settings.autoDownload) {
        await chrome.downloads.download({
          url: result.downloadUrl,
          filename: result.filename,
          saveAs: false,
        });

        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Audio Extracted',
          message: `Downloading ${result.filename}`,
        });
      } else {
        // Show notification with option to download
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Audio Extracted',
          message: `Ready to download ${result.filename}`,
        });
      }
    } catch (error) {
      console.error('Context menu extraction failed:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Extraction Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
