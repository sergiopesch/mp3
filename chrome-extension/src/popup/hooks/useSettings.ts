import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging/send';
import type { Settings } from '../../shared/types/storage';
import { DEFAULT_SETTINGS } from '../../shared/types/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sendMessage({
        type: 'GET_SETTINGS',
      });
      setSettings(response.settings || DEFAULT_SETTINGS);
    } catch (e) {
      console.error('Failed to load settings:', e);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      await sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings,
      });
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    updateSettings,
  };
}
