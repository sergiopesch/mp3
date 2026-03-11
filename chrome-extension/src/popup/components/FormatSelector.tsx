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
        Download Settings
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          The self-hosted extractor currently produces MP3 files only. Auto-download remains configurable below.
        </div>

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
