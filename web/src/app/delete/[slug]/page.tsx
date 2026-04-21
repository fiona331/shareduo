"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function DeleteForm({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "deleting" | "deleted" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    if (!token) return;
    setStatus("deleting");
    try {
      const res = await fetch(`/api/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_token: token }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("deleted");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Delete failed");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-red-500">
        Missing delete token. Please use the link you received when uploading.
      </p>
    );
  }

  if (status === "deleted") {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-1">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">Artifact deleted</p>
        <a href="/" className="text-sm text-blue-500 hover:text-blue-600 block">
          Upload another →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        This will permanently delete artifact{" "}
        <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">{slug}</code>.
        This cannot be undone.
      </p>
      {status === "error" && (
        <p className="text-red-500 text-sm">{errorMsg}</p>
      )}
      <button
        onClick={handleDelete}
        disabled={status === "deleting"}
        className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-100 disabled:text-gray-300 text-white rounded-xl text-sm font-medium transition-colors"
      >
        {status === "deleting" ? "Deleting…" : "Delete permanently"}
      </button>
      <a
        href="/"
        className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </a>
    </div>
  );
}

export default function DeletePage({ params }: { params: { slug: string } }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-900">Delete artifact</h1>
            <p className="text-sm text-gray-400">ShareDuo</p>
          </div>
          <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
            <DeleteForm slug={params.slug} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
