import React, { useState, useEffect, useCallback } from 'react';
import ExtractForm, { getUrlFromForm } from './components/ExtractForm';
import { HistoryList } from './components/HistoryList';
import { StatusMessage } from './components/StatusMessage';
import { ProgressBar } from './components/ProgressBar';
import { RangePreview } from './components/RangePreview';
import { useExtract } from './hooks/useExtract';
import { useHistory } from './hooks/useHistory';
import { sendMessage } from '../shared/messaging/send';

type Tab = 'extract' | 'history';
type BackendStatus = 'checking' | 'running' | 'stopped' | 'starting' | 'error';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('extract');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [backendError, setBackendError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const {
    fetchInfo, extract, status, progress, result, error, reset, download,
    metadata, rangeStart, rangeEnd, setRangeStart, setRangeEnd,
  } = useExtract();
  const { history, loading, refresh, clearHistory } = useHistory();

  const checkBackend = useCallback(async () => {
    setBackendStatus('checking');
    try {
      const response = await sendMessage({ type: 'CHECK_BACKEND' });
      setBackendStatus(response.running ? 'running' : 'stopped');
    } catch {
      setBackendStatus('stopped');
    }
  }, []);

  const startBackend = useCallback(async () => {
    setBackendStatus('starting');
    setBackendError('');
    try {
      const response = await sendMessage({ type: 'START_BACKEND' });
      if (response.success) {
        setBackendStatus('running');
      } else {
        setBackendStatus('error');
        setBackendError(response.error || 'Failed to start the backend');
      }
    } catch (e) {
      setBackendStatus('error');
      setBackendError(e instanceof Error ? e.message : 'Failed to start the backend');
    }
  }, []);

  const handleGetInfo = useCallback(async (url: string) => {
    setCurrentUrl(url);
    await fetchInfo(url);
  }, [fetchInfo]);

  const handleExtract = useCallback(async () => {
    if (!currentUrl) return;
    await extract(currentUrl);
  }, [currentUrl, extract]);

  const handleReset = useCallback(() => {
    setCurrentUrl('');
    reset();
  }, [reset]);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  useEffect(() => {
    if (activeTab === 'history') {
      refresh();
    }
  }, [activeTab, refresh]);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">MP3 Extractor</span>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="settings-btn"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" />
          </svg>
        </button>
      </header>

      {backendStatus !== 'running' ? (
        <main className="popup-content">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '20px' }}>
            {backendStatus === 'checking' && (
              <>
                <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: '#8b5cf6', borderRadius: '50%' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Checking backend...</p>
              </>
            )}

            {backendStatus === 'stopped' && (
              <>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Backend is offline</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Start the extraction server to begin</p>
                </div>
                <button onClick={startBackend} className="btn-primary" style={{ marginTop: '4px' }}>
                  Start Backend
                </button>
              </>
            )}

            {backendStatus === 'starting' && (
              <>
                <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: '#8b5cf6', borderRadius: '50%' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Starting backend...</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This may take a few seconds</p>
                </div>
              </>
            )}

            {backendStatus === 'error' && (
              <>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Could not start backend</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '260px' }}>{backendError}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={startBackend} className="btn-primary">
                    Retry
                  </button>
                  <button onClick={checkBackend} className="btn-secondary">
                    Check Again
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      ) : (
        <>
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === 'extract' ? 'active' : ''}`}
              onClick={() => setActiveTab('extract')}
            >
              Extract
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History {history.length > 0 && `(${history.length})`}
            </button>
          </nav>

          <main className="popup-content">
            {activeTab === 'extract' ? (
              <>
                {status === 'idle' && (
                  <ExtractForm onGetInfo={handleGetInfo} loading={false} />
                )}
                {status === 'loading-meta' && (
                  <ExtractForm onGetInfo={handleGetInfo} loading={true} />
                )}
                {status === 'preview' && metadata && (
                  <RangePreview
                    title={metadata.title}
                    durationSeconds={metadata.durationSeconds}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    onRangeStartChange={setRangeStart}
                    onRangeEndChange={setRangeEnd}
                    onExtract={handleExtract}
                    onReset={handleReset}
                  />
                )}
                {status === 'extracting' && (
                  <ProgressBar message={progress || 'Processing...'} />
                )}
                {status === 'done' && result && (
                  <StatusMessage
                    type="success"
                    filename={result.filename}
                    onDownload={download}
                    onReset={handleReset}
                  />
                )}
                {status === 'error' && (
                  <StatusMessage
                    type="error"
                    message={error}
                    onReset={handleReset}
                  />
                )}
              </>
            ) : (
              <HistoryList
                history={history}
                loading={loading}
                onClear={clearHistory}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
