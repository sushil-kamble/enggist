# Enggist Ingest Cron Worker

Cloudflare Worker that triggers the Enggist ingest API once daily at midnight UTC.

## Setup

### 1. Install Dependencies

```bash
cd workers/ingest-cron
pnpm install
```

### 2. Set Secrets

```bash
# Set your production app URL
wrangler secret put APP_URL
# Enter: https://enggist.vercel.app (or your production URL)

# Set ingest secret (same as INGEST_SECRET in .env.local)
wrangler secret put INGEST_SECRET
# Enter: <your-secret-from-env>
```

### 3. Deploy

```bash
pnpm run deploy
```

### 4. Test Locally

```bash
# Test scheduled trigger
pnpm run test
```

## Configuration

- **Schedule**: Once daily at midnight UTC (`0 0 * * *`)
- **Endpoint**: `POST ${APP_URL}/api/ingest/run`
- **Auth**: Bearer token via `INGEST_SECRET`

## Monitoring

View logs in real-time:

```bash
wrangler tail
```

## Manual Trigger

To manually trigger the worker (for testing):

```bash
curl "https://enggist-ingest-cron.<your-subdomain>.workers.dev/__scheduled?cron=*+*+*+*+*"
```

Or use the Cloudflare dashboard to trigger manually.
