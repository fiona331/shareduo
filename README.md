# ShareDuo

A no-account HTML sharing tool. Paste or upload an HTML artifact, get a shareable preview link and a secret delete link — that's it. Live at [shareduo.com](https://shareduo.com).

## Local development

**Prerequisites:** Docker, Node.js 18+

```bash
# 1. Start Postgres and MinIO
docker compose up -d

# 2. Copy env file and fill in values (defaults work for local)
cp .env.example web/.env
cp .env.example preview/.env

# 3. Create the MinIO bucket (first time only)
#    Visit http://localhost:9001, log in as minioadmin/minioadmin,
#    create a bucket named "artifacts".

# 4. Install dependencies
cd web && npm install
cd ../preview && npm install
cd ../mcp && npm install

# 5. Push the database schema
cd ../web && npm run db:push

# 6. Run all three servers (three terminals)
cd web && npm run dev          # http://localhost:3000
cd preview && npm run dev      # http://localhost:3001
cd mcp && npm run dev          # http://localhost:3002
```

## Deploy in under 15 minutes

### Infrastructure
- **Neon** (Postgres): create a project, copy the connection string
- **Cloudflare R2**: create a bucket, generate an API token with R2 Object Read & Write
- **Upstash Redis**: create a database, copy REST URL and token

### /web → Vercel

```bash
cd web
npx vercel
```

Set these environment variables in the Vercel dashboard:

```
DATABASE_URL=...
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=artifacts
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
PREVIEW_BASE_URL=https://preview.yourdomain.com
SHAREDUO_API_KEY=<random 32-byte hex — generate with: openssl rand -hex 32>
CRON_SECRET=<random-secret>
```

Add a Vercel Cron job in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }]
}
```

### /preview → Railway

Connect the repo in Railway, set root directory to `/preview`, and add:

```
DATABASE_URL=...
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=artifacts
```

Build command: `npm install && npm run build`
Start command: `node dist/index.js`

### /mcp → Railway (second service)

Connect the same repo, set root directory to `/mcp`, and add:

```
SHAREDUO_API_KEY=<same key as Vercel>
SHAREDUO_BASE_URL=https://www.shareduo.com
MCP_BASE_URL=https://mcp.yourdomain.com
SHAREDUO_MCP_TOKEN=<random 32-byte hex — generate with: openssl rand -hex 32>
SHAREDUO_DEFAULT_PASSWORD=
```

Build command: `npm install && npm run build`
Start command: `node dist/index.js`

## Using the MCP server

The MCP server supports both the legacy SSE transport (Claude Code CLI) and
the newer Streamable HTTP transport (claude.ai / Cowork). Auth is OAuth 2.1
with dynamic client registration — users just paste the URL and type the
`SHAREDUO_MCP_TOKEN` into a password page during the OAuth flow.

### Claude Code CLI

```bash
claude mcp add shareduo -t sse -s user \
  -H "Authorization: Bearer <SHAREDUO_MCP_TOKEN>" \
  -- https://mcp.yourdomain.com
```

### claude.ai / Cowork

Go to **Settings → Connectors → Add custom connector**:
- **Remote MCP server URL:** `https://mcp.yourdomain.com`
- Leave **OAuth Client ID** and **OAuth Client Secret** blank — the server
  supports dynamic client registration, so claude.ai registers itself
- Click **Connect** → you'll be redirected to a password page
- Enter your `SHAREDUO_MCP_TOKEN` → done

Then just say **"push this to ShareDuo"** and Claude will upload the artifact and return a preview link.

## Environment variables

### /web (Vercel)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `R2_ENDPOINT` | Yes | S3-compatible endpoint (R2 or MinIO) |
| `R2_ACCESS_KEY_ID` | Yes | S3 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | S3 secret key |
| `R2_BUCKET_NAME` | Yes | Bucket name |
| `UPSTASH_REDIS_REST_URL` | No | Omit to use in-memory rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | No | Omit to use in-memory rate limiter |
| `PREVIEW_BASE_URL` | Yes | Base URL of the preview server |
| `SHAREDUO_API_KEY` | Yes | API key for programmatic uploads (MCP) |
| `CRON_SECRET` | Yes | Bearer token for the cleanup cron endpoint |

### /preview (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `R2_ENDPOINT` | Yes | S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | Yes | S3 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | S3 secret key |
| `R2_BUCKET_NAME` | Yes | Bucket name |

### /mcp (Railway)

| Variable | Required | Description |
|---|---|---|
| `SHAREDUO_API_KEY` | Yes | Must match the key set on Vercel |
| `SHAREDUO_BASE_URL` | Yes | Canonical URL of the web app. Use `https://www.shareduo.com` (the `www.` form) — the apex redirects and breaks POSTs |
| `MCP_BASE_URL` | Yes | Public URL of the MCP server itself (e.g. `https://mcp.yourdomain.com`). Used as the OAuth issuer |
| `SHAREDUO_MCP_TOKEN` | Yes | Shared secret. Each user enters this on the password page during OAuth |
| `SHAREDUO_DEFAULT_PASSWORD` | No | Default password applied to all MCP uploads when the caller doesn't specify one |

## Taking down abusive content

Soft-delete a share by slug using the API directly:

```bash
curl -X DELETE https://yourdomain.com/api/<slug> \
  -H "Content-Type: application/json" \
  -d '{"secret_token": "<token>"}'
```

If you don't have the token (e.g. abuse takedown), set `abuse_flagged_at` directly in the database:

```sql
UPDATE shares SET abuse_flagged_at = now() WHERE slug = '<slug>';
```

The preview server will immediately serve a "removed" page instead of the content.
