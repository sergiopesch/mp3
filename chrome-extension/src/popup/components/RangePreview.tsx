interface RangePreviewProps {
  title: string;
  durationSeconds: number;
  rangeStart: number;
  rangeEnd: number;
  onRangeStartChange: (value: number) => void;
  onRangeEndChange: (value: number) => void;
  onExtract: () => void;
  onReset: () => void;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RangePreview({
  title,
  durationSeconds,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  onExtract,
  onReset,
}: RangePreviewProps) {
  const isFullClip = rangeStart === 0 && rangeEnd === durationSeconds;
  const selectedDuration = rangeEnd - rangeStart;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Title card */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: durationSeconds > 0 ? '16px' : '0' }}>
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
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="truncate" style={{ fontSize: '13px', fontWeight: 500 }}>{title}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {formatTime(durationSeconds)}
            </p>
          </div>
        </div>

        {/* Range slider */}
        {durationSeconds > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Select range
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {isFullClip ? 'Full clip' : `${formatTime(selectedDuration)} selected`}
              </span>
            </div>

            <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
              {/* Track background */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: '4px',
                background: 'var(--bg-tertiary)', borderRadius: '2px',
              }} />
              {/* Active range */}
              <div style={{
                position: 'absolute', height: '4px', background: 'white', borderRadius: '2px',
                left: `${(rangeStart / durationSeconds) * 100}%`,
                right: `${100 - (rangeEnd / durationSeconds) * 100}%`,
              }} />
              {/* Start slider */}
              <input
                type="range"
                min={0}
                max={durationSeconds}
                step={1}
                value={rangeStart}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v < rangeEnd) onRangeStartChange(v);
                }}
                style={{
                  position: 'absolute', width: '100%', height: '10px',
                  WebkitAppearance: 'none', appearance: 'none' as 'none',
                  background: 'transparent', pointerEvents: 'none', margin: 0,
                }}
                className="range-thumb"
              />
              {/* End slider */}
              <input
                type="range"
                min={0}
                max={durationSeconds}
                step={1}
                value={rangeEnd}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > rangeStart) onRangeEndChange(v);
                }}
                style={{
                  position: 'absolute', width: '100%', height: '10px',
                  WebkitAppearance: 'none', appearance: 'none' as 'none',
                  background: 'transparent', pointerEvents: 'none', margin: 0,
                }}
                className="range-thumb"
              />
            </div>

            {/* Time labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {formatTime(rangeStart)}
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {formatTime(rangeEnd)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Extract button */}
      <button onClick={onExtract} className="btn-primary">
        {isFullClip ? 'Extract Full Audio' : `Extract ${formatTime(selectedDuration)} Section`}
      </button>

      <button
        onClick={onReset}
        style={{
          width: '100%', color: 'var(--text-secondary)', fontSize: '13px',
          padding: '8px', borderRadius: '12px', transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        Different URL
      </button>
    </div>
  );
}
