"use client";

import { useState, useRef, useCallback } from "react";

type Status = "idle" | "extracting" | "done" | "error";

type StreamMessage =
  | { type: "progress"; message: string }
  | {
      type: "done";
      data: {
        id: string;
        title: string;
        duration: string;
        filename: string;
        downloadPath: string;
      };
    }
  | { type: "error"; message: string };

interface JobResult {
  id: string;
  title: string;
  duration: string;
  filename: string;
  downloadPath: string;
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
    setProgress("Preparing extractor...");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Extraction failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const message = JSON.parse(line) as StreamMessage;

          if (message.type === "progress") {
            setProgress(message.message);
          } else if (message.type === "done") {
            setResult(message.data);
            setStatus("done");
          } else if (message.type === "error") {
            throw new Error(message.message);
          }
        }
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    window.open(result.downloadPath, "_blank");
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
          <span className="text-xs text-[var(--text-secondary)]">self-hosted audio extractor</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Extract audio from any video
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Runs on your own backend with yt-dlp and ffmpeg. No public extraction API.
            </p>
          </div>

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

          {status === "idle" && (
            <button
              onClick={handleExtract}
              disabled={!url.trim()}
              className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Extract Audio
            </button>
          )}

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

          {status === "done" && result && (
            <div className="space-y-3">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                      {result.filename} · {result.duration}
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

          {status === "idle" && (
            <div className="mt-8 text-center">
              <p className="text-[10px] uppercase tracking-widest text-[var(--accent-dim)] mb-3">
                Supports
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                <span>YouTube</span>
                <span className="text-[var(--border)]">/</span>
                <span>Vimeo</span>
                <span className="text-[var(--border)]">/</span>
                <span>TikTok</span>
                <span className="text-[var(--border)]">/</span>
                <span>X</span>
                <span className="text-[var(--border)]">/</span>
                <span>and more via yt-dlp</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
