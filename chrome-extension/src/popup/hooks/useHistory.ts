import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging/send';
import type { HistoryItem } from '../../shared/types/storage';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sendMessage({
        type: 'GET_HISTORY',
      });
      setHistory(response.history || []);
    } catch (e) {
      console.error('Failed to load history:', e);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await sendMessage({
        type: 'CLEAR_HISTORY',
      });
      setHistory([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    clearHistory,
    refresh: loadHistory,
  };
}
