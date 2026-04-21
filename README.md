# Artifact Host

A no-account HTML sharing tool. Paste or upload a Claude-generated HTML artifact, get a shareable preview link and a secret delete link — that's it.

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

# 5. Push the database schema
cd ../web && npm run db:push

# 6. Run both servers (two terminals)
cd web && npm run dev          # http://localhost:3000
cd preview && npm run dev      # http://localhost:3001
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
ABUSE_EMAIL=abuse@yourdomain.com
CRON_SECRET=<random-secret>
```

Add a Vercel Cron job in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }]
}
```

### /preview → Railway or Fly.io

**Railway:**
```bash
cd preview
npm run build
# Push to a repo and connect in Railway dashboard
# Set the same DATABASE_URL, R2_*, ABUSE_EMAIL env vars
# Start command: node dist/index.js
```

**Fly.io:**
```bash
cd preview
fly launch
fly secrets set DATABASE_URL="..." R2_ENDPOINT="..." # etc.
fly deploy
```

## Environment variables

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
| `ABUSE_EMAIL` | Yes | Email shown in the abuse report bar |
| `CRON_SECRET` | Yes | Bearer token for the cleanup cron endpoint |

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
