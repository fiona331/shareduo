import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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

function passwordPage(slug: string, error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Required — Artifact Host</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f0f18;color:#e5e7eb;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .box{width:100%;max-width:360px}
    h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}
    p{color:#9ca3af;font-size:.875rem;margin-bottom:1.5rem;line-height:1.5}
    input{width:100%;padding:.75rem 1rem;background:#1f2937;border:1px solid #374151;
          border-radius:.5rem;color:#f9fafb;font-size:1rem;margin-bottom:.75rem;outline:none}
    input:focus{border-color:#6366f1}
    button{width:100%;padding:.75rem;background:#4f46e5;color:#fff;border:none;
           border-radius:.5rem;font-size:1rem;cursor:pointer;font-weight:500}
    button:hover{background:#4338ca}
    .error{color:#f87171;font-size:.875rem;margin-bottom:.75rem}
  </style>
</head>
<body>
  <div class="box">
    <h1>Password Required</h1>
    <p>This artifact is password protected. Enter the password to view it.</p>
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="POST" action="/${slug}">
      <input type="password" name="password" placeholder="Enter password" autofocus required>
      <button type="submit">View artifact</button>
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

  c.header("Content-Type", "text/html; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'none'; form-action 'none'");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");

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
