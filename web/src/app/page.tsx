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
      <main className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-indigo-100 flex items-center justify-center p-6">
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is my file stored permanently?",
        acceptedAnswer: { "@type": "Answer", text: "No. Every artifact expires automatically based on the window you choose — 1 hour to 30 days. After expiry the file is deleted from storage. You can also delete it early at any time from your manage page." },
      },
      {
        "@type": "Question",
        name: "Who can see my file?",
        acceptedAnswer: { "@type": "Answer", text: "Only people with the link. Nothing is indexed, listed, or shared publicly. Add a password to restrict access further — only people with both the link and the password can view it." },
      },
      {
        "@type": "Question",
        name: "Do you need my email or account?",
        acceptedAnswer: { "@type": "Answer", text: "No. Nothing is stored about you as the uploader — no email, no name, no account. The only thing linking you to your artifact is the manage link you keep after uploading." },
      },
      {
        "@type": "Question",
        name: "What file types does ShareDuo support?",
        acceptedAnswer: { "@type": "Answer", text: "HTML files only (.html). If you have a Claude artifact, download it from Claude or ask Claude to output the full HTML code. Max file size is 5 MB." },
      },
      {
        "@type": "Question",
        name: "What's the difference between the preview link and the manage link?",
        acceptedAnswer: { "@type": "Answer", text: "The preview link is what you share — anyone with it can view your artifact. The manage link is private and only for you — it shows view counts and lets you delete the artifact." },
      },
      {
        "@type": "Question",
        name: "Is ShareDuo free?",
        acceptedAnswer: { "@type": "Answer", text: "Yes, completely free. No paid plans, no credit card, no account required." },
      },
      {
        "@type": "Question",
        name: "Does the preview work on mobile?",
        acceptedAnswer: { "@type": "Answer", text: "Yes. The preview runs in a standard browser on any device. Whether it looks good depends on whether the artifact is responsive — Claude-generated artifacts usually are." },
      },
      {
        "@type": "Question",
        name: "Can I embed a ShareDuo artifact in another page?",
        acceptedAnswer: { "@type": "Answer", text: "Yes — use an <iframe> with the preview URL as the src. Set width and height to match your layout." },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-indigo-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-semibold text-gray-900 tracking-tight">ShareDuo</span>
        <div className="flex items-center gap-5">
          <a
            href="/blog"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Blog
          </a>
          <a
            href="https://github.com/fiona331/shareduo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>
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

            {/* Trust strip */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                No account or email needed
              </span>
              <span className="text-gray-200 text-xs hidden sm:inline">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Auto-deletes after expiry
              </span>
              <span className="text-gray-200 text-xs hidden sm:inline">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete anytime
              </span>
            </div>
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

        {/* FAQ */}
        <div className="w-full max-w-3xl mt-16">
          <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
            FAQ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7">

            {/* Security & Privacy */}
            <div className="space-y-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Security &amp; Privacy</p>

              <div>
                <p className="text-sm font-semibold text-gray-800">Is my file stored permanently?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">No. Every artifact expires automatically based on the window you choose — 1 hour to 30 days. After expiry the file is deleted from storage. You can also delete it early at any time from your manage page.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">Who can see my file?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Only people with the link. Nothing is indexed, listed, or shared publicly. Add a password to restrict access further — only people with both the link and the password can view it.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">Do you need my email or account?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">No. Nothing is stored about you as the uploader — no email, no name, no account. The only thing linking you to your artifact is the manage link you keep after uploading.</p>
              </div>
            </div>

            {/* Using ShareDuo */}
            <div className="space-y-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Using ShareDuo</p>

              <div>
                <p className="text-sm font-semibold text-gray-800">What file types does ShareDuo support?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">HTML files only (.html). If you have a Claude artifact, download it from Claude or ask Claude to output the full HTML code. Max file size is 5 MB.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">What&apos;s the difference between the preview link and the manage link?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">The preview link is what you share — anyone with it can view your artifact. The manage link is private and only for you — it shows view counts and lets you delete the artifact.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">Is ShareDuo free?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Yes, completely free. No paid plans, no credit card, no account required.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">Does the preview work on mobile?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Yes. The preview runs in a standard browser on any device. Whether it looks good depends on whether the artifact is responsive — Claude-generated artifacts usually are.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">Can I embed a ShareDuo artifact in another page?</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Yes — use an &lt;iframe&gt; with the preview URL as the src. Set width and height to match your layout.</p>
              </div>
            </div>

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
          <a href="https://github.com/fiona331/shareduo" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">
            Open source
          </a>
          {" "}·{" "}
          <a href="mailto:fiona@tf9ventures.com" className="hover:text-gray-400 transition-colors">
            Send feedback
          </a>
        </p>
      </footer>

    </div>
  );
}
