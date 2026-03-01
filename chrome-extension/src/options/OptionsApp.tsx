import React, { useState, useEffect } from 'react';
import type { Settings } from '../shared/types/storage';
import { DEFAULT_SETTINGS } from '../shared/types/storage';

const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:3000/api/extract');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get(['settings', 'apiEndpoint'], (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
      if (result.apiEndpoint) {
        setApiEndpoint(result.apiEndpoint);
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ settings, apiEndpoint }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>MP3 Extractor Settings</h1>

      <div style={{ marginBottom: '20px', padding: '12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
        <strong>⚠️ Setup Required:</strong> This extension requires a proxy server. Run <code>npm run dev</code> in the mp3 directory or deploy the Next.js app to Vercel.
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          API Endpoint
        </label>
        <input
          type="text"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="http://localhost:3000/api/extract"
          style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
        />
        <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
          Default: http://localhost:3000/api/extract (local) or your deployed URL
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Audio Format
        </label>
        <select
          value={settings.audioFormat}
          onChange={(e) => setSettings({ ...settings, audioFormat: e.target.value as any })}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="mp3">MP3</option>
          <option value="wav">WAV</option>
          <option value="ogg">OGG</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Audio Bitrate
        </label>
        <select
          value={settings.audioBitrate}
          onChange={(e) => setSettings({ ...settings, audioBitrate: e.target.value as any })}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="128">128 kbps</option>
          <option value="256">256 kbps</option>
          <option value="320">320 kbps</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.autoDownload}
            onChange={(e) => setSettings({ ...settings, autoDownload: e.target.checked })}
          />
          Auto-download after extraction
        </label>
      </div>

      <button
        onClick={handleSave}
        style={{
          padding: '10px 20px',
          background: saved ? '#4caf50' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
};

export default OptionsApp;
