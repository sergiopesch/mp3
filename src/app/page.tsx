"use client";

import { useState, useRef, useCallback } from "react";

type Status = "idle" | "extracting" | "done" | "error";

interface JobResult {
  downloadUrl: string;
  filename: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExtract = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    setStatus("extracting");
    setProgress("Processing...");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Extraction failed");
      }

      setResult(data);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    window.open(
      `/api/download?url=${encodeURIComponent(result.downloadUrl)}&filename=${encodeURIComponent(result.filename)}`,
      "_blank"
    );
  }, [result]);

  const handleReset = useCallback(() => {
    setUrl("");
    setStatus("idle");
    setProgress("");
    setResult(null);
    setError("");
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && status !== "extracting") {
      handleExtract();
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">mp3</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">audio extractor</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Extract audio from any video
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Paste a URL. Get the audio in best quality. That&apos;s it.
            </p>
          </div>

          {/* Input area */}
          <div className="relative mb-4">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://youtube.com/watch?v=..."
              disabled={status === "extracting"}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-sm text-[var(--text)] placeholder:text-[var(--accent-dim)] focus:outline-none focus:border-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--text-secondary)] transition-all disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Action button */}
          {status === "idle" && (
            <button
              onClick={handleExtract}
              disabled={!url.trim()}
              className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Extract Audio
            </button>
          )}

          {/* Extracting state */}
          {status === "extracting" && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
                  <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
                <span className="text-sm font-medium">Extracting audio...</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] pl-8">{progress}</p>
            </div>
          )}

          {/* Done state */}
          {status === "done" && result && (
            <div className="space-y-3">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{result.filename}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Ready to download
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download MP3
              </button>

              <button
                onClick={handleReset}
                className="w-full text-[var(--text-secondary)] text-sm py-2.5 rounded-xl hover:text-[var(--text)] transition-colors"
              >
                Extract another
              </button>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="space-y-3">
              <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full text-[var(--text-secondary)] text-sm py-2.5 rounded-xl hover:text-[var(--text)] transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Supported platforms */}
          {status === "idle" && (
            <div className="mt-8 text-center">
              <p className="text-[10px] uppercase tracking-widest text-[var(--accent-dim)] mb-3">
                Supports
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-secondary)]">
                <span>YouTube</span>
                <span className="text-[var(--border)]">/</span>
                <span>Vimeo</span>
                <span className="text-[var(--border)]">/</span>
                <span>Twitter</span>
                <span className="text-[var(--border)]">/</span>
                <span>TikTok</span>
                <span className="text-[var(--border)]">/</span>
                <span>1000+ more</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-[var(--accent-dim)]">
          <span>Powered by cobalt</span>
          <span>Best quality, always</span>
        </div>
      </footer>
    </main>
  );
}
