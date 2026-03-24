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
import { ensureBackendRunning } from './api/backend-launcher';
import { fetchMetadata } from './api/cobalt';
import {
  GetHistoryRequest,
  GetSettingsRequest,
  UpdateSettingsRequest,
  ClearHistoryRequest,
  CheckBackendRequest,
  StartBackendRequest,
  FetchMetadataRequest,
} from '../shared/types/messages';
import { DEFAULT_SETTINGS } from '../shared/types/storage';

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

router.register('FETCH_METADATA', async (message: FetchMetadataRequest) => {
  const result = await fetchMetadata(message.url);
  if ('error' in result) {
    return { success: false, error: result.error };
  }
  return { success: true, title: result.title, durationSeconds: result.durationSeconds };
});

router.register('CHECK_BACKEND', async (_message: CheckBackendRequest) => {
  const settings = await SettingsManager.getSettings();
  const apiEndpoint = settings.apiEndpoint || DEFAULT_SETTINGS.apiEndpoint;
  try {
    const base = new URL(apiEndpoint).origin;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(base, { signal: controller.signal });
    clearTimeout(timer);
    return { running: res.ok || res.status === 404 };
  } catch {
    return { running: false };
  }
});

router.register('START_BACKEND', async (_message: StartBackendRequest) => {
  const settings = await SettingsManager.getSettings();
  const apiEndpoint = settings.apiEndpoint || DEFAULT_SETTINGS.apiEndpoint;
  const result = await ensureBackendRunning(apiEndpoint);
  return { success: result.ok, error: result.message };
});

// Start listening for messages
router.listen();

// Setup context menu
setupContextMenu();
handleContextMenuClick();

// Log service worker activation
console.log('MP3 Extractor service worker activated');

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});
