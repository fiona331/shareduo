"use client";

import { useState } from "react";

/**
 * Delete action for the manage page. Inline confirm UI (not a browser
 * confirm() dialog) so it's visually consistent with the rest of the site.
 * Calls the existing DELETE /api/:slug route with the secret token in the
 * body.
 */
export function DeleteButton({ slug, token }: { slug: string; token: string }) {
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "deleted" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
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

  if (status === "deleted") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-800">Artifact deleted</p>
        <a href="/" className="text-xs text-green-700 hover:text-green-800 block">
          Upload another →
        </a>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
      >
        Delete this artifact
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        This permanently deletes the artifact. Anyone with the preview link will see a
        "deleted" page. This cannot be undone.
      </p>
      {status === "error" && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={status === "deleting"}
          className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={status === "deleting"}
          className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-xl transition-colors"
        >
          {status === "deleting" ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    </div>
  );
}
