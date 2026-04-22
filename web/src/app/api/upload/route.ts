import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { uploadHtml } from "@/lib/storage";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyApiKey } from "@/lib/apikey";
import { scanForAbuse, ABUSE_BLOCK_SCORE, ABUSE_FLAG_SCORE } from "@/lib/abuse";

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_BYTES = 5 * 1024 * 1024;

function generateSlug(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes)
    .map((b) => SLUG_CHARS[b % SLUG_CHARS.length])
    .join("");
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const authHeader = req.headers.get("authorization");

  if (authHeader !== null) {
    // API key path — must present a valid key, no IP rate limiting
    if (!verifyApiKey(authHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // Web UI path — enforce IP rate limit
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  let html: string;
  let password: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pasted = formData.get("html") as string | null;
    password = formData.get("password") as string | null;

    if (file) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
      }
      html = await file.text();
    } else if (pasted) {
      if (new TextEncoder().encode(pasted).length > MAX_BYTES) {
        return NextResponse.json({ error: "Content too large (max 5 MB)" }, { status: 413 });
      }
      html = pasted;
    } else {
      return NextResponse.json({ error: "No HTML provided" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const trimmed = html.trimStart().toLowerCase();
  if (!trimmed.startsWith("<!doctype") && !trimmed.startsWith("<html")) {
    return NextResponse.json(
      { error: "Content does not appear to be HTML" },
      { status: 400 }
    );
  }

  // Abuse scan — reject clear-cut malicious content before writing to storage.
  // Medium-score uploads are allowed but pre-flagged so the preview server
  // serves them as "removed" and the cleanup cron eventually prunes them.
  const abuse = scanForAbuse(html);
  if (abuse.score >= ABUSE_BLOCK_SCORE) {
    console.warn(
      `[abuse] blocked upload from ip=${ip.slice(0, 16)} score=${abuse.score}`,
      abuse.signals
    );
    return NextResponse.json(
      { error: "This content violates ShareDuo's abuse policy and cannot be uploaded." },
      { status: 422 }
    );
  }
  if (abuse.score >= ABUSE_FLAG_SCORE) {
    console.warn(
      `[abuse] flagged upload from ip=${ip.slice(0, 16)} score=${abuse.score}`,
      abuse.signals
    );
  }

  const slug = generateSlug();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const storageKey = `uploads/${slug}.html`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const passwordHash =
    password && password.trim() ? await bcrypt.hash(password.trim(), 10) : null;
  const abuseFlagged = abuse.score >= ABUSE_FLAG_SCORE ? new Date() : null;

  await uploadHtml(storageKey, html);

  await db.insert(shares).values({
    slug,
    secret_token: tokenHash,
    storage_key: storageKey,
    expires_at: expiresAt,
    uploader_ip_hash: ipHash,
    password_hash: passwordHash,
    abuse_flagged_at: abuseFlagged,
  });

  const previewBase =
    process.env.PREVIEW_BASE_URL ?? "http://localhost:3001";

  return NextResponse.json({
    slug,
    secret_token: rawToken,
    preview_url: `${previewBase}/${slug}`,
    delete_url: `/api/${slug}`,
  });
}
