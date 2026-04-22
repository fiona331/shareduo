// ---------------------------------------------------------------------------
// Abuse detection — Layer 1 (regex heuristics)
// ---------------------------------------------------------------------------
//
// Fast, synchronous scan that runs on every upload before we write the file
// to object storage. Scored system rather than hard block so we get a chance
// to tune before rejecting legitimate artifacts. Each pattern contributes
// weight; the caller decides what to do with the total.
//
// Thresholds the caller should use:
//   score >= 10 → REJECT the upload (clearly malicious)
//   score >= 5  → ALLOW but flag for review (soft-delete candidate)
//   score <  5  → clean
//
// This is defense-in-depth only. Determined attackers can evade every
// individual pattern; the point is to catch the lazy ones cheaply and buy
// time before Layer 2 (Safe Browsing API) kicks in.

export interface AbuseSignal {
  name: string;
  weight: number;
  evidence?: string;
}

export interface AbuseScanResult {
  score: number;
  signals: AbuseSignal[];
}

// Common brands whose login pages get imitated by phishers. Kept short on
// purpose — broader lists produce too many false positives on legitimate
// tutorials, comparison sites, etc.
const PHISHED_BRANDS = [
  "google",
  "gmail",
  "microsoft",
  "outlook",
  "office365",
  "apple",
  "icloud",
  "paypal",
  "amazon",
  "netflix",
  "facebook",
  "instagram",
  "chase",
  "wellsfargo",
  "bankofamerica",
  "citibank",
  "coinbase",
  "binance",
  "metamask",
] as const;

const BRAND_REGEX = new RegExp(`\\b(${PHISHED_BRANDS.join("|")})\\b`, "gi");

// Known crypto-miner script signatures. These libraries are mostly dead, but
// still show up in abandoned sites and occasionally new campaigns.
const MINER_SIGNATURES = [
  /coinhive/i,
  /cryptoloot/i,
  /coin-hive/i,
  /cryptonight/i,
  /minero\.cc/i,
  /webmine\.cz/i,
  /\bcoin_hive\b/i,
  // In-browser miner WASM patterns
  /new\s+CryptoNight/i,
  /startMining\s*\(/i,
];

// JS obfuscation patterns that are very rare in legitimate artifacts but
// common in malware loaders.
const OBFUSCATION_SIGNATURES: Array<{ re: RegExp; weight: number; name: string }> = [
  {
    re: /eval\s*\(\s*atob\s*\(/i,
    weight: 6,
    name: "eval_atob",
  },
  {
    re: /document\.write\s*\(\s*unescape\s*\(/i,
    weight: 6,
    name: "document_write_unescape",
  },
  {
    re: /eval\s*\(\s*unescape\s*\(/i,
    weight: 6,
    name: "eval_unescape",
  },
  {
    // Long runs of hex-escaped chars — almost always obfuscated strings
    re: /(?:\\x[0-9a-f]{2}){40,}/i,
    weight: 4,
    name: "long_hex_escapes",
  },
];

// Download bait. Legitimate artifacts rarely push .exe/.msi/.dmg/.apk files.
const DOWNLOAD_BAIT_RE =
  /\b(download|click\s+here|get\s+it\s+now)[^<]{0,50}\.(exe|msi|dmg|apk|scr)\b/i;

// Meta refresh that redirects off-site quickly.
const META_REFRESH_EXTERNAL_RE =
  /<meta[^>]+http-equiv=["']?refresh["']?[^>]+url=["']?https?:\/\/([^"'/ >]+)/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a URL points to an origin other than same-origin/relative. */
function isExternalUrl(url: string, selfOrigin: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?")) return false;
  try {
    const u = new URL(url, "https://example.test");
    if (selfOrigin) return !u.origin.includes(selfOrigin);
    return /^https?:/.test(u.protocol);
  } catch {
    return false;
  }
}

function extractFormActions(html: string): string[] {
  const out: string[] = [];
  const re = /<form\b[^>]*\baction\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function hasPasswordField(html: string): boolean {
  return /<input[^>]*\btype\s*=\s*["']?password["']?/i.test(html);
}

// ---------------------------------------------------------------------------
// Main scanner
// ---------------------------------------------------------------------------

export function scanForAbuse(html: string, selfOrigin: string | null = null): AbuseScanResult {
  const signals: AbuseSignal[] = [];

  // --- Brand-impersonation phishing -----------------------------------------
  // A password field AND a brand name AND a form that submits off-origin is
  // the classic phishing shape. Any two of three is also suspicious.
  const lowered = html.toLowerCase();
  const brandMatches = Array.from(lowered.matchAll(BRAND_REGEX)).map(m => m[0]);
  const hasBrand = brandMatches.length > 0;
  const hasPw = hasPasswordField(html);
  const externalFormActions = extractFormActions(html).filter(a =>
    isExternalUrl(a, selfOrigin)
  );
  const hasExternalFormPost = externalFormActions.length > 0;

  if (hasPw && hasBrand && hasExternalFormPost) {
    signals.push({
      name: "brand_phishing_combo",
      weight: 10,
      evidence: `brand=${brandMatches[0]}, external_action=${externalFormActions[0]}`,
    });
  } else if (hasPw && hasBrand) {
    signals.push({
      name: "brand_plus_password_field",
      weight: 4,
      evidence: `brand=${brandMatches[0]}`,
    });
  } else if (hasPw && hasExternalFormPost) {
    signals.push({
      name: "password_form_external_post",
      weight: 6,
      evidence: externalFormActions[0],
    });
  }

  // --- Crypto miners --------------------------------------------------------
  for (const re of MINER_SIGNATURES) {
    const m = html.match(re);
    if (m) {
      signals.push({
        name: "crypto_miner_signature",
        weight: 10,
        evidence: m[0].slice(0, 80),
      });
      break; // one hit is enough
    }
  }

  // --- JS obfuscation loaders ----------------------------------------------
  for (const { re, weight, name } of OBFUSCATION_SIGNATURES) {
    const m = html.match(re);
    if (m) {
      signals.push({ name, weight, evidence: m[0].slice(0, 80) });
    }
  }

  // --- Download bait --------------------------------------------------------
  const dl = html.match(DOWNLOAD_BAIT_RE);
  if (dl) {
    signals.push({
      name: "download_bait",
      weight: 3,
      evidence: dl[0].slice(0, 80),
    });
  }

  // --- Meta refresh to external origin --------------------------------------
  const refresh = html.match(META_REFRESH_EXTERNAL_RE);
  if (refresh) {
    signals.push({
      name: "meta_refresh_external",
      weight: 5,
      evidence: `→ ${refresh[1]}`,
    });
  }

  const score = signals.reduce((s, sig) => s + sig.weight, 0);
  return { score, signals };
}

// Public thresholds so callers agree on what "blocked" vs "flagged" means.
export const ABUSE_BLOCK_SCORE = 10;
export const ABUSE_FLAG_SCORE  = 5;
