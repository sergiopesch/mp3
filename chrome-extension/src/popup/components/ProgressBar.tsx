interface ProgressBarProps {
  message: string;
}

export function ProgressBar({ message }: ProgressBarProps) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ position: 'relative', width: '20px', height: '20px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid var(--border)',
            }}
          />
          <div
            className="animate-spin"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid white',
              borderTopColor: 'transparent',
            }}
          />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Extracting audio...</span>
      </div>
      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          paddingLeft: '32px',
        }}
      >
        {message}
      </p>
    </div>
  );
}
