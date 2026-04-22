import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { shares } from "./schema.js";
import { isBot } from "./lib/bots.js";

// ---------------------------------------------------------------------------
// Infrastructure clients
// ---------------------------------------------------------------------------

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { shares } });

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Security headers for user-rendered HTML
// ---------------------------------------------------------------------------
//
// ShareDuo serves arbitrary user HTML on preview.shareduo.com. The subdomain
// isolates cookies/localStorage from the web app — but we still need CSP to
// defend against clickjacking, base-tag hijacking, and plugin-based attacks,
// and to shrink the blast radius if a malicious artifact slips past abuse
// detection.
//
// Policy design tradeoff: Claude-generated artifacts routinely load CDN
// scripts (Tailwind, Chart.js, etc.), Google Fonts, remote images, and make
// fetch() calls to public APIs. Hard-locking default-src to 'self' would
// break the product. Allowing https: for most resources preserves utility;
// locking form-action, frame-ancestors, base-uri, and object-src shuts
// down the attacks we actually care about (phishing forms, clickjacking,
// <base> href hijacking, Flash-era plugins).

const CSP_DIRECTIVES = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:",
  "frame-ancestors 'none'",       // no embedding our preview in someone else's iframe
  "form-action 'self'",           // forms can only submit back to us (kills off-site phishing)
  "base-uri 'self'",              // prevent <base href="evil"> hijacking of relative links
  "object-src 'none'",            // no Flash/plugins
  "upgrade-insecure-requests",    // force https for any subresource
].join("; ");

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "interest-cohort=()",
].join(", ");

function applySecurityHeaders(c: {
  header: (name: string, value: string) => void;
}) {
  c.header("Content-Type", "text/html; charset=utf-8");
  c.header("Content-Security-Policy", CSP_DIRECTIVES);
  c.header("Permissions-Policy", PERMISSIONS_POLICY);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY"); // legacy twin of frame-ancestors 'none'
  c.header("Referrer-Policy", "no-referrer");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Cross-Origin-Resource-Policy", "same-site");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  // Never set cookies on this domain — previews must stay stateless
}

// ---------------------------------------------------------------------------
// View counter — fire-and-forget increment on successful preview serve
// ---------------------------------------------------------------------------
//
// Hono on Node (Railway) doesn't have executionCtx.waitUntil. We rely on the
// long-lived Node process to keep the detached promise alive past the
// handler return. Accepting occasional lost counts on deploy/SIGTERM — a
// view counter isn't worth extra infra complexity.

function incrementViewCount(slug: string, userAgent: string | null | undefined): void {
  if (isBot(userAgent)) return;
  void db
    .update(shares)
    .set({
      view_count:     sql`${shares.view_count} + 1`, // atomic under row lock
      last_viewed_at: sql`now()`,                     // DB clock, avoids skew
    })
    .where(eq(shares.slug, slug))
    .catch((err) => console.error("[view-count] update failed:", err));
}

function errorPage(title: string, message: string): string {
  title = escapeHtml(title);
  message = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ShareDuo</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fff 0%,#f9fafb 50%,#eff6ff 100%);
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:2.5rem;
          max-width:380px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .logo{font-size:.75rem;font-weight:600;color:#9ca3af;letter-spacing:.05em;text-transform:uppercase;margin-bottom:1.5rem}
    h1{font-size:1.125rem;font-weight:600;color:#111827;margin-bottom:.5rem}
    p{color:#6b7280;font-size:.875rem;line-height:1.6}
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">ShareDuo</p>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function passwordPage(slug: string, error?: string): string {
  slug = escapeHtml(slug);
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Required — ShareDuo</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fff 0%,#f9fafb 50%,#eff6ff 100%);
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:2.5rem;
          max-width:360px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .logo{font-size:.75rem;font-weight:600;color:#9ca3af;letter-spacing:.05em;text-transform:uppercase;margin-bottom:1.5rem}
    h1{font-size:1.125rem;font-weight:600;color:#111827;margin-bottom:.375rem}
    .sub{color:#6b7280;font-size:.875rem;margin-bottom:1.5rem;line-height:1.5}
    input{width:100%;padding:.625rem .875rem;background:#f9fafb;border:1px solid #e5e7eb;
          border-radius:.75rem;color:#111827;font-size:.9375rem;margin-bottom:.75rem;outline:none;
          transition:border-color .15s}
    input:focus{border-color:#d1d5db;background:#fff}
    button{width:100%;padding:.625rem;background:#111827;color:#fff;border:none;
           border-radius:.75rem;font-size:.9375rem;cursor:pointer;font-weight:500;transition:background .15s}
    button:hover{background:#374151}
    .error{color:#ef4444;font-size:.8125rem;margin-bottom:.75rem}
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">ShareDuo</p>
    <h1>Password required</h1>
    <p class="sub">This content is protected. Enter the password to continue.</p>
    ${errorHtml}
    <form method="POST" action="/${slug}">
      <input type="password" name="password" placeholder="Enter password" autofocus required>
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`;
}


// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono();

app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  // Validate slug shape early to avoid pointless DB hits
  if (!/^[a-z0-9]{1,32}$/.test(slug)) {
    return c.html(errorPage("Not Found", "This artifact does not exist."), 404);
  }

  let share;
  try {
    const rows = await db
      .select()
      .from(shares)
      .where(eq(shares.slug, slug))
      .limit(1);
    share = rows[0];
  } catch {
    return c.html(
      errorPage("Error", "Could not load artifact. Please try again later."),
      500
    );
  }

  if (!share) {
    return c.html(errorPage("Not Found", "This artifact does not exist."), 404);
  }

  if (share.deleted_at !== null) {
    return c.html(
      errorPage("Deleted", "This artifact has been deleted by its owner."),
      410
    );
  }

  if (share.expires_at < new Date()) {
    return c.html(
      errorPage("Expired", "This artifact has expired. Artifacts are kept for 30 days."),
      410
    );
  }

  if (share.abuse_flagged_at !== null) {
    return c.html(
      errorPage("Removed", "This artifact was removed for violating our abuse policy."),
      451
    );
  }

  if (share.password_hash !== null) {
    return c.html(passwordPage(slug), 200);
  }

  let userHtml: string;
  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: share.storage_key })
    );
    userHtml = await obj.Body!.transformToString("utf-8");
  } catch {
    return c.html(
      errorPage("Error", "Could not load artifact content. Please try again later."),
      500
    );
  }

  incrementViewCount(slug, c.req.header("User-Agent"));
  applySecurityHeaders(c);
  return c.body(userHtml, 200);
});

app.post("/:slug", async (c) => {
  const slug = c.req.param("slug");

  if (!/^[a-z0-9]{1,32}$/.test(slug)) {
    return c.html(errorPage("Not Found", "This artifact does not exist."), 404);
  }

  const body = await c.req.parseBody();
  const password = body["password"] as string | undefined;

  if (!password) {
    return c.html(passwordPage(slug, "Please enter a password."), 400);
  }

  let share;
  try {
    const rows = await db.select().from(shares).where(eq(shares.slug, slug)).limit(1);
    share = rows[0];
  } catch {
    return c.html(errorPage("Error", "Could not load artifact. Please try again later."), 500);
  }

  if (!share || share.deleted_at !== null) {
    return c.html(errorPage("Not Found", "This artifact does not exist."), 404);
  }

  if (share.expires_at < new Date()) {
    return c.html(errorPage("Expired", "This artifact has expired."), 410);
  }

  if (!share.password_hash) {
    return c.redirect(`/${slug}`);
  }

  const valid = await bcrypt.compare(password, share.password_hash);
  if (!valid) {
    return c.html(passwordPage(slug, "Incorrect password. Please try again."), 401);
  }

  let userHtml: string;
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: share.storage_key }));
    userHtml = await obj.Body!.transformToString("utf-8");
  } catch {
    return c.html(errorPage("Error", "Could not load artifact content."), 500);
  }

  incrementViewCount(slug, c.req.header("User-Agent"));
  applySecurityHeaders(c);
  return c.body(userHtml, 200);
});

app.get("/", (c) =>
  c.html(
    errorPage(
      "Artifact Host — Preview Server",
      "Append a share slug to the URL to view an artifact."
    )
  )
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Preview server listening on http://localhost:${PORT}`);
});
