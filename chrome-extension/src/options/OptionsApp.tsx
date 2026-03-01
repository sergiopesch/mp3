import React, { useState, useEffect } from 'react';
import type { Settings } from '../shared/types/storage';
import { DEFAULT_SETTINGS } from '../shared/types/storage';

const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get('settings', (result) => {
      if (result.settings) {
        setSettings(result.settings);
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
