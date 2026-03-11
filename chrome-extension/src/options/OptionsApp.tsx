import React, { useState, useEffect } from 'react';
import type { Settings } from '../shared/types/storage';
import { DEFAULT_SETTINGS } from '../shared/types/storage';

const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ settings }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>MP3 Extractor Settings</h1>

      <div style={{ marginBottom: '20px', padding: '12px', background: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
        <strong>Self-hosted backend required.</strong> The extension now talks to your own mp3 app backend for every extraction.
      </div>

      <div style={{ marginBottom: '20px', padding: '12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px', fontSize: '13px' }}>
        <strong>Note:</strong> Default endpoint is localhost for local development. If you deploy the app elsewhere, change the API endpoint below to that server's <code>/api/extract</code> URL.
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          API Endpoint
        </label>
        <input
          type="text"
          value={settings.apiEndpoint}
          onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
          placeholder="http://localhost:3000/api/extract"
          style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
        />
        <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
          Default: local app endpoint. Point this at your deployed backend if you host the extractor elsewhere.
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
