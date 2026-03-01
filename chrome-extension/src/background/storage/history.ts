/**
 * History manager using chrome.storage.local
 */

import { HistoryItem, MAX_HISTORY_ITEMS } from '../../shared/types/storage';

const HISTORY_KEY = 'history';

export class HistoryManager {
  /**
   * Get all history items
   */
  static async getHistory(): Promise<HistoryItem[]> {
    try {
      const result = await chrome.storage.local.get(HISTORY_KEY);
      return result[HISTORY_KEY] || [];
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * Add a history item
   */
  static async addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      const history = await this.getHistory();

      const newItem: HistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      // Add to beginning and limit to MAX_HISTORY_ITEMS
      const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);

      await chrome.storage.local.set({ [HISTORY_KEY]: updated });
    } catch (error) {
      console.error('Failed to add history item:', error);
      throw error;
    }
  }

  /**
   * Clear all history
   */
  static async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({ [HISTORY_KEY]: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  }

  /**
   * Remove a specific history item
   */
  static async removeHistoryItem(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const updated = history.filter(item => item.id !== id);
      await chrome.storage.local.set({ [HISTORY_KEY]: updated });
    } catch (error) {
      console.error('Failed to remove history item:', error);
      throw error;
    }
  }
}
