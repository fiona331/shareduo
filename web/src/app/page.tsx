"use client";

import { useState, useCallback, useRef } from "react";
import { TTL_OPTIONS, DEFAULT_TTL, type TtlValue } from "@/lib/ttl";

interface UploadResult {
  slug: string;
  secret_token: string;
  preview_url: string;
  manage_url: string;
  delete_url: string;
  expires_at: string;
}

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (hours < 24) return `in ~${Math.max(1, hours)}h`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Feature strip
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "View analytics",
    body: "See exactly how many times your link was opened",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Password protection",
    body: "Lock your share — only invited eyes",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Expiry control",
    body: "Links live for 1 hour, 1 day, 7 days, or 30 days",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Push from Claude",
    body: "Share directly from Claude via the MCP server",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    title: "No account to view",
    body: "Anyone can open it — no login, no Claude needed",
  },
];

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS = [
  {
    n: "1",
    title: "Paste or drop your HTML",
    body: "From Claude, VS Code, anywhere — drag a file or paste the code directly.",
  },
  {
    n: "2",
    title: "Set your options",
    body: "Choose an expiry window and optionally add a password. Defaults are fine too.",
  },
  {
    n: "3",
    title: "Share your link",
    body: "Anyone can open it in any browser — no account, no Claude subscription required.",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Home() {
  const [html, setHtml] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<TtlValue>(DEFAULT_TTL);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".html") && file.type !== "text/html") {
      setError("Please upload an .html file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setHtml(e.target?.result as string);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!html.trim()) {
      setError("Please paste HTML or upload a file");
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("html", html);
    if (password.trim()) formData.append("password", password.trim());
    formData.append("expires_in", expiresIn);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (result) {
    const manageLink =
      result.manage_url ??
      `${window.location.origin}/manage/${result.slug}?token=${result.secret_token}`;
    return (
      <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-4">

          <div className="text-center pb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Your artifact is live</h1>
            <p className="text-sm text-gray-500 mt-1">
              Share the preview link with anyone · Expires {formatExpiry(result.expires_at)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={result.preview_url}
                className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 border border-gray-200 focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(result.preview_url)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
            <a
              href={result.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              Open preview →
            </a>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manage link</p>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Save this</span>
            </div>
            <p className="text-xs text-gray-400">
              Bookmark this to see views or delete later. Keep it private.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={manageLink}
                className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 border border-gray-200 focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(manageLink)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setHtml("");
              setPassword("");
              setError(null);
            }}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Upload another
          </button>

        </div>
      </main>
    );
  }

  // ── Upload state ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-semibold text-gray-900 tracking-tight">ShareDuo</span>
        <a
          href="https://mcp.shareduo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Add to Claude
        </a>
      </nav>

      <main className="flex flex-col items-center px-6 pb-24">

        {/* Hero */}
        <div className="text-center space-y-3 pt-10 pb-8 max-w-xl">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
            Give your Claude artifact<br className="hidden sm:block" /> a shareable link
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">
            Paste your HTML, get a URL anyone can open — no Claude account needed to view.
            <br className="hidden sm:block" />
            Track views, set expiry, add a password. Free.
          </p>
          <p className="text-xs text-gray-400">
            Perfect for Claude artifacts · HTML prototypes · Demo pages · Landing page mockups
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full max-w-xl">

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer px-8 py-10 text-center transition-colors ${
              dragging ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                dragging ? "bg-blue-100" : "bg-gray-100"
              }`}>
                <svg className={`w-6 h-6 ${dragging ? "text-blue-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {dragging ? "Drop to upload" : "Drop an .html file here"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,text/html"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          <div className="flex items-center gap-3 px-8">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or paste HTML</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="p-4 space-y-3">
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<!DOCTYPE html>..."
              className="w-full h-36 bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-xs text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
              spellCheck={false}
            />

            <div className="space-y-1">
              <label className="text-xs text-gray-400">
                Password <span className="text-gray-300">(optional)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Protect with a password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Expires after</label>
              <div className="flex gap-1.5">
                {TTL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiresIn(opt.value)}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      expiresIn === opt.value
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              onClick={handleUpload}
              disabled={uploading || !html.trim()}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {uploading ? "Uploading…" : "Upload & share"}
            </button>
          </div>
        </div>

        {/* Feature strip */}
        <div className="w-full max-w-3xl mt-16">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-white border border-gray-100">
                <div className="text-gray-400">{f.icon}</div>
                <p className="text-xs font-semibold text-gray-700">{f.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="w-full max-w-2xl mt-16">
          <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="text-center py-8 space-y-1.5">
        <p className="text-xs text-gray-400">
          Max 5 MB · No account needed · Free forever
        </p>
        <p className="text-xs text-gray-300">
          Made with ♥ in San Francisco ·{" "}
          <a href="mailto:hello@shareduo.com" className="hover:text-gray-400 transition-colors">
            Send feedback
          </a>
        </p>
      </footer>

    </div>
  );
}
