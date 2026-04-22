"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* noop — clipboard may be unavailable in some contexts */
        }
      }}
      className="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
