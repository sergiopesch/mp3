import { useState, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging/send';
import type { ExtractAudioResponse } from '../../shared/types/messages';

export type ExtractStatus = 'idle' | 'extracting' | 'done' | 'error';

interface ExtractResult {
  downloadUrl: string;
  filename: string;
}

export function useExtract() {
  const [status, setStatus] = useState<ExtractStatus>('idle');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');

  const extract = useCallback(async (url: string) => {
    setStatus('extracting');
    setProgress('Processing...');
    setError('');
    setResult(null);

    try {
      const response = await sendMessage({
        type: 'EXTRACT_AUDIO',
        url: url.trim(),
      });

      if (!response.success || response.error) {
        throw new Error(response.error || 'Extraction failed');
      }

      if (!response.downloadUrl || !response.filename) {
        throw new Error('Invalid response from service worker');
      }

      setResult({
        downloadUrl: response.downloadUrl,
        filename: response.filename,
      });
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress('');
    setResult(null);
    setError('');
  }, []);

  const download = useCallback(async () => {
    if (!result) return;

    try {
      await sendMessage({
        type: 'DOWNLOAD_AUDIO',
        downloadUrl: result.downloadUrl,
        filename: result.filename,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  }, [result]);

  return {
    status,
    progress,
    result,
    error,
    extract,
    reset,
    download,
  };
}
