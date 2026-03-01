interface StatusMessageProps {
  type: 'success' | 'error';
  filename?: string;
  message?: string;
  onDownload?: () => void;
  onReset?: () => void;
}

export function StatusMessage({ type, filename, message, onDownload, onReset }: StatusMessageProps) {
  if (type === 'success' && filename) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#4ade80' }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                className="truncate"
                style={{ fontSize: '13px', fontWeight: 500 }}
              >
                {filename}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                }}
              >
                Ready to download
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onDownload}
          style={{
            width: '100%',
            background: 'white',
            color: 'black',
            fontWeight: 500,
            fontSize: '13px',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e5e5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download MP3
        </button>

        <button
          onClick={onReset}
          style={{
            width: '100%',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            padding: '10px',
            borderRadius: '12px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Extract another
        </button>
      </div>
    );
  }

  if (type === 'error' && message) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            background: 'rgba(127, 29, 29, 0.3)',
            border: '1px solid rgba(153, 27, 27, 0.5)',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#fca5a5' }}
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <p style={{ fontSize: '13px', color: '#fca5a5' }}>{message}</p>
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            width: '100%',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            padding: '10px',
            borderRadius: '12px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}
