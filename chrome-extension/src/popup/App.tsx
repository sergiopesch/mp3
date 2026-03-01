import React, { useState, useEffect } from 'react';
import ExtractForm from './components/ExtractForm';
import { HistoryList } from './components/HistoryList';
import { StatusMessage } from './components/StatusMessage';
import { useExtract } from './hooks/useExtract';
import { useHistory } from './hooks/useHistory';

type Tab = 'extract' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('extract');
  const { extract, status, error } = useExtract();
  const { history, loading, refresh, clearHistory } = useHistory();

  // Refresh history when switching to history tab
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
            <ExtractForm onExtract={extract} loading={status === 'extracting'} />
            {error && <StatusMessage type="error" message={error} />}
            {status === 'done' && <StatusMessage type="success" message="Download started!" />}
          </>
        ) : (
          <HistoryList
            history={history}
            loading={loading}
            onClear={clearHistory}
          />
        )}
      </main>
    </div>
  );
}
