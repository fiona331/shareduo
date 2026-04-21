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
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-green-400">Uploaded!</h1>
            <p className="text-gray-400 text-sm mt-1">Your artifact is live</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-300">Preview link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={result.preview_url}
                className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm font-mono text-gray-100 border border-gray-700 focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(result.preview_url)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Copy
              </button>
            </div>
            <a
              href={result.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              Open preview →
            </a>
          </div>

          <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-yellow-400">Save your delete link — it won&apos;t be shown again</p>
            <p className="text-xs text-gray-400">
              Use this link to delete your artifact. Keep it private.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={deleteLink}
                className="flex-1 bg-gray-800 rounded px-3 py-2 text-xs font-mono text-yellow-200 border border-yellow-900 focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(deleteLink)}
                className="px-3 py-2 bg-yellow-900 hover:bg-yellow-800 rounded text-sm text-yellow-100 transition-colors"
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
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 transition-colors"
          >
            Upload another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Artifact Host</h1>
          <p className="text-gray-400">
            Share Claude-generated HTML artifacts. No account required.
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-950/20"
              : "border-gray-700 hover:border-gray-600 hover:bg-gray-900/40"
          }`}
        >
          <p className="text-sm text-gray-400">
            Drag &amp; drop a{" "}
            <code className="text-gray-300 bg-gray-800 px-1 rounded">.html</code>{" "}
            file here, or click to browse
          </p>
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-500">or paste HTML</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Paste HTML here..."
          className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
          spellCheck={false}
        />

        <div className="space-y-1">
          <label className="text-sm text-gray-400">
            Password protect <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for public access"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={uploading || !html.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg font-medium transition-colors"
        >
          {uploading ? "Uploading..." : "Upload & share"}
        </button>

        <p className="text-center text-xs text-gray-600">
          Files are kept for 30 days · Max 5 MB · No account required
        </p>
      </div>
    </main>
  );
}
