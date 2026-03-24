import { useState, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging/send';

export type ExtractStatus = 'idle' | 'loading-meta' | 'preview' | 'extracting' | 'done' | 'error';

interface ExtractResult {
  downloadUrl: string;
  filename: string;
}

interface Metadata {
  title: string;
  durationSeconds: number;
}

export function useExtract() {
  const [status, setStatus] = useState<ExtractStatus>('idle');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);

  const fetchInfo = useCallback(async (url: string) => {
    setStatus('loading-meta');
    setError('');
    setMetadata(null);

    try {
      const response = await sendMessage({
        type: 'FETCH_METADATA',
        url: url.trim(),
      });

      if (!response.success || response.error) {
        throw new Error(response.error || 'Failed to fetch info');
      }

      const meta = {
        title: response.title || 'Audio',
        durationSeconds: response.durationSeconds || 0,
      };
      setMetadata(meta);
      setRangeStart(0);
      setRangeEnd(meta.durationSeconds);
      setStatus('preview');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }, []);

  const extract = useCallback(async (url: string) => {
    setStatus('extracting');
    setProgress('Processing...');
    setError('');
    setResult(null);

    const isFullClip = metadata && rangeStart === 0 && rangeEnd === metadata.durationSeconds;
    const message: {
      type: 'EXTRACT_AUDIO';
      url: string;
      startTime?: number;
      endTime?: number;
    } = {
      type: 'EXTRACT_AUDIO',
      url: url.trim(),
    };

    if (!isFullClip) {
      message.startTime = rangeStart;
      message.endTime = rangeEnd;
    }

    try {
      const response = await sendMessage(message);

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
  }, [metadata, rangeStart, rangeEnd]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress('');
    setResult(null);
    setError('');
    setMetadata(null);
    setRangeStart(0);
    setRangeEnd(0);
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
    metadata,
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    fetchInfo,
    extract,
    reset,
    download,
  };
}
