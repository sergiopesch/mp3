/**
 * Storage schema types for chrome.storage.local
 */

export interface Settings {
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
  autoDownload: true,
  apiEndpoint: 'http://localhost:3000/api/extract',
};

export const MAX_HISTORY_ITEMS = 100;
