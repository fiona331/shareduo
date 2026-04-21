import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { shares } from "./schema.js";

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
const ABUSE_EMAIL = process.env.ABUSE_EMAIL ?? "abuse@yourdomain.com";
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Artifact Host</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f0f18;color:#e5e7eb;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .box{text-align:center;max-width:420px}
    h1{font-size:1.5rem;margin-bottom:.75rem;color:#f87171}
    p{color:#9ca3af;line-height:1.6}
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function abuseBar(slug: string): string {
  const subject = encodeURIComponent(`Abuse report: ${slug}`);
  return `<div style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#1a1a2e;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:13px;line-height:1;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.5)"><span>This is user-uploaded content hosted by Artifact Host</span><a href="mailto:${ABUSE_EMAIL}?subject=${subject}" style="color:#fca5a5;text-decoration:none;margin-left:16px;white-space:nowrap">Report abuse</a></div>`;
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

  // Security headers — set before returning
  c.header("Content-Type", "text/html; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'none'; form-action 'none'"
  );
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  // Never set cookies on this domain

  // Prepend abuse bar as a separate HTML block before the user's doctype
  return c.body(abuseBar(slug) + userHtml, 200);
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
