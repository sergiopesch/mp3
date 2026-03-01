/**
 * Service Worker - Main entry point for Chrome extension background process
 * Manifest V3 service worker
 */

import { MessageRouter } from './utils/message-router';
import { handleExtractAudio } from './handlers/extract';
import { handleDownloadAudio } from './handlers/download';
import { setupContextMenu, handleContextMenuClick } from './handlers/context-menu';
import { HistoryManager } from './storage/history';
import { SettingsManager } from './storage/settings';
import {
  GetHistoryRequest,
  GetSettingsRequest,
  UpdateSettingsRequest,
  ClearHistoryRequest,
} from '../shared/types/messages';

// Initialize message router
const router = new MessageRouter();

// Register message handlers
router.register('EXTRACT_AUDIO', handleExtractAudio);
router.register('DOWNLOAD_AUDIO', handleDownloadAudio);

router.register('GET_HISTORY', async (_message: GetHistoryRequest) => {
  const history = await HistoryManager.getHistory();
  return { history };
});

router.register('GET_SETTINGS', async (_message: GetSettingsRequest) => {
  const settings = await SettingsManager.getSettings();
  return { settings };
});

router.register('UPDATE_SETTINGS', async (message: UpdateSettingsRequest) => {
  await SettingsManager.updateSettings(message.settings);
  return { success: true };
});

router.register('CLEAR_HISTORY', async (_message: ClearHistoryRequest) => {
  await HistoryManager.clearHistory();
  return { success: true };
});

// Start listening for messages
router.listen();

// Setup context menu
setupContextMenu();
handleContextMenuClick();

// Log service worker activation
console.log('MP3 Extractor service worker activated');

// Keep service worker alive (optional, for debugging)
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

// Handle extension icon click (optional - open popup)
chrome.action.onClicked.addListener(() => {
  chrome.action.openPopup();
});
