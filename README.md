# ShareDuo

A no-account HTML sharing tool. Paste or upload an HTML artifact, get a shareable preview link and a secret delete link. Live at [shareduo.com](https://shareduo.com).

> **Note:** The web app (homepage, blog, API routes) lives in a separate private repo. This repo contains the open-source components: the **preview server** and the **MCP server**.

## What's in this repo

- **`preview/`** — Hono server that serves user-submitted HTML on a sandboxed subdomain (`preview.shareduo.com`). Deployed to Railway.
- **`mcp/`** — MCP server that lets Claude push artifacts directly to ShareDuo without leaving the conversation. Deployed to Railway.

## Local development

**Prerequisites:** Docker, Node.js 18+

```bash
# 1. Start Postgres and MinIO
docker compose up -d

# 2. Copy env file and fill in values (defaults work for local)
cp .env.example preview/.env
cp .env.example mcp/.env

# 3. Create the MinIO bucket (first time only)
#    Visit http://localhost:9001, log in as minioadmin/minioadmin,
#    create a bucket named "artifacts".

# 4. Install dependencies
cd preview && npm install
cd ../mcp && npm install

# 5. Run the servers (two terminals)
cd preview && npm run dev      # http://localhost:3001
cd mcp && npm run dev          # http://localhost:3002
```

## Deploy

### /preview → Railway

Connect this repo in Railway, set root directory to `preview`, and add:

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

Connect the same repo, set root directory to `mcp`, and add:

```
SHAREDUO_API_KEY=<same key as the web app>
SHAREDUO_BASE_URL=https://www.shareduo.com
MCP_BASE_URL=https://mcp.yourdomain.com
SHAREDUO_MCP_TOKEN=<random 32-byte hex — generate with: openssl rand -hex 32>
SHAREDUO_DEFAULT_PASSWORD=
UPSTASH_REDIS_REST_URL=<same as web app>
UPSTASH_REDIS_REST_TOKEN=<same as web app>
```

Build command: `npm install && npm run build`
Start command: `node dist/index.js`

> Without Upstash Redis the MCP server falls back to in-memory OAuth state, which is lost on every restart — every connected Claude user has to re-authenticate. Strongly recommended to set it in production.

## Using the MCP server

The MCP server supports both the legacy SSE transport (Claude Code CLI) and the newer Streamable HTTP transport (claude.ai). Auth is OAuth 2.1 with dynamic client registration.

### Claude Code CLI

```bash
claude mcp add shareduo -t sse -s user \
  -H "Authorization: Bearer <SHAREDUO_MCP_TOKEN>" \
  -- https://mcp.yourdomain.com
```

### claude.ai

Go to **Settings → Connectors → Add custom connector**:
- **Remote MCP server URL:** `https://mcp.yourdomain.com`
- Leave OAuth fields blank — the server supports dynamic client registration
- Click **Connect** → enter your `SHAREDUO_MCP_TOKEN` on the password page

Then say **"push this to ShareDuo"** and Claude uploads the artifact and returns a preview link.

## Environment variables

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
| `SHAREDUO_API_KEY` | Yes | Must match the key set on the web app |
| `SHAREDUO_BASE_URL` | Yes | Use `https://www.shareduo.com` (the `www.` form — the apex redirects and breaks POSTs) |
| `MCP_BASE_URL` | Yes | Public URL of the MCP server (used as OAuth issuer) |
| `SHAREDUO_MCP_TOKEN` | Yes | Shared secret users enter during OAuth |
| `SHAREDUO_DEFAULT_PASSWORD` | No | Default password applied to all MCP uploads |
| `UPSTASH_REDIS_REST_URL` | Recommended | Persist OAuth state across restarts |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Paired with `UPSTASH_REDIS_REST_URL` |

## Taking down abusive content

If you don't have the delete token, set `abuse_flagged_at` directly in the database:

```sql
UPDATE shares SET abuse_flagged_at = now() WHERE slug = '<slug>';
```

The preview server immediately serves a "removed" page instead of the content.
