/**
 * Context menu handler
 */

import { extractAudio } from '../api/cobalt';
import { ensureBackendRunning } from '../api/backend-launcher';
import { HistoryManager } from '../storage/history';
import { SettingsManager } from '../storage/settings';
import { DEFAULT_SETTINGS } from '../../shared/types/storage';

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
      // Ensure the backend is running before extraction
      const preSettings = await SettingsManager.getSettings();
      const apiEndpoint = preSettings.apiEndpoint || DEFAULT_SETTINGS.apiEndpoint;
      const backend = await ensureBackendRunning(apiEndpoint);
      if (!backend.ok) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Backend Not Running',
          message: backend.message || 'Could not start the backend',
        });
        return;
      }

      const result = await extractAudio(url);

      if ('error' in result) {
        await HistoryManager.addHistoryItem({
          url,
          filename: '',
          downloadUrl: '',
          status: 'error',
          error: result.error,
        });

        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Extraction Failed',
          message: result.error,
        });
        return;
      }

      await HistoryManager.addHistoryItem({
        url,
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        status: 'success',
      });

      const settings = await SettingsManager.getSettings();
      if (settings.autoDownload) {
        await chrome.downloads.download({
          url: result.downloadUrl,
          filename: result.filename,
          saveAs: false,
        });

        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Audio Extracted',
          message: `Downloading ${result.filename}`,
        });
      } else {
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
