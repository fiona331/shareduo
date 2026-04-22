// ---------------------------------------------------------------------------
// Relative time formatting — "3 min ago", "in 6 days", etc.
// ---------------------------------------------------------------------------
//
// Hand-rolled to avoid a dayjs/date-fns dependency for a 20-line helper.
// Server-only rendering (manage page is a server component), so no locale
// flicker concerns from SSR hydration.

const UNITS: Array<{ seconds: number; label: string }> = [
  { seconds: 60,          label: "second" },
  { seconds: 3600,        label: "minute" },
  { seconds: 86400,       label: "hour"   },
  { seconds: 604800,      label: "day"    },
  { seconds: 2592000,     label: "week"   },
  { seconds: 31536000,    label: "month"  },
  { seconds: Infinity,    label: "year"   },
];

/**
 * Format a date as a human-readable relative time vs. now.
 *
 * Past:   "3 min ago", "2 days ago", "just now"
 * Future: "in 6 days", "in 2 hours"
 */
export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  const isFuture = diffSec > 0;

  if (abs < 30) return "just now";

  for (let i = 0; i < UNITS.length; i++) {
    const unit = UNITS[i];
    if (abs < unit.seconds) {
      const prev = i === 0 ? 1 : UNITS[i - 1].seconds;
      const value = Math.round(abs / prev);
      const label = value === 1 ? unit.label : `${unit.label}s`;
      return isFuture ? `in ${value} ${label}` : `${value} ${label} ago`;
    }
  }
  return isFuture ? "in the future" : "a long time ago";
}

/** Absolute date for tooltips / hover. */
export function absoluteTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
