import { timingSafeEqual } from "crypto";

/**
 * Returns true if the request carries a valid SHAREDUO_API_KEY.
 * Returns false if no key is configured or header is absent/invalid.
 * Uses timingSafeEqual to prevent timing-oracle attacks.
 */
export function verifyApiKey(authHeader: string | null): boolean {
  const expected = process.env.SHAREDUO_API_KEY;
  if (!expected) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;

  const provided = authHeader.slice(7);

  // Pad both to the same length before comparing, then check raw lengths
  const maxLen = Math.max(provided.length, expected.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  Buffer.from(provided, "utf8").copy(a);
  Buffer.from(expected, "utf8").copy(b);

  return timingSafeEqual(a, b) && provided.length === expected.length;
}
