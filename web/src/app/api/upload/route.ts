import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { uploadHtml } from "@/lib/storage";
import { checkRateLimit } from "@/lib/ratelimit";

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

  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  let html: string;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pasted = formData.get("html") as string | null;

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

  const slug = generateSlug();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const storageKey = `uploads/${slug}.html`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await uploadHtml(storageKey, html);

  await db.insert(shares).values({
    slug,
    secret_token: tokenHash,
    storage_key: storageKey,
    expires_at: expiresAt,
    uploader_ip_hash: ipHash,
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
