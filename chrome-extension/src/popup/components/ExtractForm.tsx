import React, { useState, useEffect, useRef } from 'react';

interface ExtractFormProps {
  onExtract: (url: string) => Promise<void>;
  loading: boolean;
}

export default function ExtractForm({ onExtract, loading }: ExtractFormProps) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect URL from current tab
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url;
      if (currentUrl && isVideoUrl(currentUrl)) {
        setUrl(currentUrl);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    await onExtract(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="extract-form">
      <div className="form-group">
        <label htmlFor="url-input" className="form-label">Video URL</label>
        <input
          ref={inputRef}
          id="url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="form-input"
          disabled={loading}
          autoFocus
        />
      </div>
      <button type="submit" disabled={!url.trim() || loading} className="btn-primary">
        {loading ? 'Extracting...' : 'Extract Audio'}
      </button>
    </form>
  );
}

function isVideoUrl(url: string): boolean {
  const patterns = [/youtube\.com\/watch/, /youtu\.be\//, /vimeo\.com\//, /tiktok\.com\//];
  return patterns.some(p => p.test(url));
}
