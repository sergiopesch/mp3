import type { Settings } from '../../shared/types/storage';

interface FormatSelectorProps {
  settings: Settings;
  onUpdate: (settings: Partial<Settings>) => void;
}

export function FormatSelector({ settings, onUpdate }: FormatSelectorProps) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <h3
        style={{
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
        }}
      >
        Audio Settings
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Format selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}
          >
            Format
          </label>
          <select
            value={settings.audioFormat}
            onChange={(e) => onUpdate({ audioFormat: e.target.value as Settings['audioFormat'] })}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '13px',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="ogg">OGG</option>
          </select>
        </div>

        {/* Bitrate selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}
          >
            Quality
          </label>
          <select
            value={settings.audioBitrate}
            onChange={(e) => onUpdate({ audioBitrate: e.target.value as Settings['audioBitrate'] })}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '13px',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            <option value="128">128 kbps (Good)</option>
            <option value="256">256 kbps (Better)</option>
            <option value="320">320 kbps (Best)</option>
          </select>
        </div>

        {/* Auto-download toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <input
            type="checkbox"
            checked={settings.autoDownload}
            onChange={(e) => onUpdate({ autoDownload: e.target.checked })}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '13px', flex: 1 }}>Auto-download after extraction</span>
        </label>
      </div>
    </div>
  );
}
