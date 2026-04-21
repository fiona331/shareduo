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
      <p className="text-red-400 text-sm">
        Missing delete token. Please use the link you received when uploading.
      </p>
    );
  }

  if (status === "deleted") {
    return (
      <div className="text-center space-y-4">
        <p className="text-green-400 text-xl font-semibold">Artifact deleted.</p>
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm block">
          Upload another →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm">
        Delete artifact{" "}
        <code className="text-yellow-300 bg-gray-800 px-1 rounded">{slug}</code>?
        This cannot be undone.
      </p>
      {status === "error" && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
      <button
        onClick={handleDelete}
        disabled={status === "deleting"}
        className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg font-medium transition-colors"
      >
        {status === "deleting" ? "Deleting..." : "Delete permanently"}
      </button>
      <a
        href="/"
        className="block text-center text-sm text-gray-500 hover:text-gray-400"
      >
        Cancel
      </a>
    </div>
  );
}

export default function DeletePage({ params }: { params: { slug: string } }) {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-red-400 text-center">
          Delete Artifact
        </h1>
        <Suspense fallback={<p className="text-gray-400 text-sm">Loading…</p>}>
          <DeleteForm slug={params.slug} />
        </Suspense>
      </div>
    </main>
  );
}
