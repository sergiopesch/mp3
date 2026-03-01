/**
 * Settings manager using chrome.storage.local
 */

import { Settings, DEFAULT_SETTINGS } from '../../shared/types/storage';

const SETTINGS_KEY = 'settings';

export class SettingsManager {
  /**
   * Get current settings
   */
  static async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      return result[SETTINGS_KEY] || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update settings
   */
  static async updateSettings(updates: Partial<Settings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...updates };
      await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }
}
