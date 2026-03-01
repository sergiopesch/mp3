import type { HistoryItem } from '../../shared/types/storage';

interface HistoryListProps {
  history: HistoryItem[];
  loading: boolean;
  onClear: () => void;
}

export function HistoryList({ history, loading, onClear }: HistoryListProps) {
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
        }}
      >
        <div className="animate-spin" style={{ position: 'relative', width: '24px', height: '24px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid var(--border)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid white',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--text-secondary)' }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          No extractions yet
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {history.length} {history.length === 1 ? 'extraction' : 'extractions'}
        </span>
        <button
          onClick={onClear}
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Clear all
        </button>
      </div>

      <div
        style={{
          maxHeight: '480px',
          overflowY: 'auto',
        }}
      >
        {history.map((item) => (
          <HistoryItemComponent key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function HistoryItemComponent({ item }: { item: HistoryItem }) {
  const date = new Date(item.timestamp);
  const timeAgo = getTimeAgo(item.timestamp);

  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: item.status === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {item.status === 'success' ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#4ade80' }}
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#ef4444' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="truncate"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '2px',
            }}
          >
            {item.filename}
          </p>
          <p
            className="truncate"
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginBottom: '4px',
            }}
          >
            {item.url}
          </p>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--accent-dim)',
            }}
          >
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
