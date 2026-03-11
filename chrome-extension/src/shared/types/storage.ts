/**
 * Storage schema types for chrome.storage.local
 */

export interface Settings {
  audioFormat: 'mp3' | 'wav' | 'ogg';
  audioBitrate: '128' | '256' | '320';
  autoDownload: boolean;
  apiEndpoint: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  filename: string;
  downloadUrl: string;
  timestamp: number;
  status: 'success' | 'error';
  error?: string;
}

export interface StorageSchema {
  settings: Settings;
  history: HistoryItem[];
}

export const DEFAULT_SETTINGS: Settings = {
  audioFormat: 'mp3',
  audioBitrate: '320',
  autoDownload: true,
  apiEndpoint: 'http://localhost:3000/api/extract',
};

export const MAX_HISTORY_ITEMS = 100;
