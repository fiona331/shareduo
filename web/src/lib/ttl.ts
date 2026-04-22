// ---------------------------------------------------------------------------
// TTL / expiration options for uploads
// ---------------------------------------------------------------------------
//
// Central place that defines what expiration values are allowed. Keeping
// the list here (rather than scattered across the API route, MCP tool
// schema, and UI dropdown) means adding/removing a choice is one edit.
//
// Capped at 30 days for now — going longer starts looking like permanent
// hosting, which isn't what ShareDuo is for. If you want "never," re-upload.

export const TTL_OPTIONS = [
  { value: "1h",  label: "1 hour",  seconds: 60 * 60 },
  { value: "1d",  label: "1 day",   seconds: 24 * 60 * 60 },
  { value: "7d",  label: "7 days",  seconds: 7 * 24 * 60 * 60 },
  { value: "30d", label: "30 days", seconds: 30 * 24 * 60 * 60 },
] as const;

export type TtlValue = (typeof TTL_OPTIONS)[number]["value"];

export const DEFAULT_TTL: TtlValue = "30d";

export function ttlToExpiresAt(value: string | null | undefined): Date {
  const option =
    TTL_OPTIONS.find(o => o.value === value) ??
    TTL_OPTIONS.find(o => o.value === DEFAULT_TTL)!;
  return new Date(Date.now() + option.seconds * 1000);
}

export function isValidTtl(value: string | null | undefined): value is TtlValue {
  return value != null && TTL_OPTIONS.some(o => o.value === value);
}
