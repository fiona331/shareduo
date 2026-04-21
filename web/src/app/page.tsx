"use client";

import { useState, useCallback, useRef } from "react";

interface UploadResult {
  slug: string;
  secret_token: string;
  preview_url: string;
  delete_url: string;
}

export default function Home() {
  const [html, setHtml] = useState("");
  const [password, setPassword] = useState("");
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

  if (result) {
    const deleteLink = `${window.location.origin}/delete/${result.slug}?token=${result.secret_token}`;
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
            <p className="text-sm text-gray-500 mt-1">Share the preview link with anyone</p>
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
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delete link</p>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Save this</span>
            </div>
            <p className="text-xs text-gray-400">Won&apos;t be shown again. Keep it private.</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={deleteLink}
                className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 border border-gray-200 focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(deleteLink)}
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-6">

        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">ShareDuo</h1>
          <p className="text-sm text-gray-500">
            Share HTML artifacts instantly. No account required.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer px-8 py-12 text-center transition-colors ${
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

        <p className="text-center text-xs text-gray-400">
          Kept for 30 days · Max 5 MB · No account needed
        </p>

      </div>
    </main>
  );
}
