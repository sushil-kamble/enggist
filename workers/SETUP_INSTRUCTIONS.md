# Cloudflare Workers Setup Instructions

This directory contains two cron workers:
1. **Ingest Worker** (`src/index.ts`) - Fetches RSS feeds every day at midnight UTC
2. **Summarize Worker** (`src/summarize.ts`) - Generates AI summaries once per day at 2 AM UTC

## Quick Start

### 1. Install Dependencies (Already Done ✅)

```bash
cd workers/ingest-cron
pnpm install
```

### 2. Local Development Setup

Create `.dev.vars` file for local testing:

```bash
cd workers/ingest-cron
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:
```bash
APP_URL=http://localhost:3000
INGEST_SECRET=<same-as-your-env-local>
```

### 3. Test Locally

Start your Next.js app first:
```bash
# In project root
pnpm dev
```

Then test the worker:
```bash
# In workers/ingest-cron
pnpm run test
```

This will trigger the scheduled event and call your local API.

### 4. Deploy to Production

#### A. Login to Cloudflare (First Time Only)

```bash
wrangler login
```

This will open a browser for authentication.

#### B. Set Production Secrets

```bash
cd workers/ingest-cron

# Set production app URL
wrangler secret put APP_URL
# When prompted, enter: https://enggist.vercel.app

# Set ingest secret (same as in Vercel env vars)
wrangler secret put INGEST_SECRET
# When prompted, enter: <your-secret>
```

#### C. Deploy Workers

**Deploy Ingest Worker:**
```bash
pnpm run deploy
```

**Deploy Summarization Worker:**
```bash
# Set secrets for summarization worker (uses same values)
wrangler secret put APP_URL --config wrangler.summarize.toml
# Enter: https://enggist.vercel.app

wrangler secret put INGEST_SECRET --config wrangler.summarize.toml
# Enter: <your-secret>

# Deploy
pnpm run deploy:summarize
```

**Or Deploy Both at Once:**
```bash
pnpm run deploy:all
```

Expected output:
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded enggist-ingest-cron (X.XX sec)
Published enggist-ingest-cron (X.XX sec)
  schedule: 0 0 * * * (midnight UTC daily)

Uploaded enggist-summarize-cron (X.XX sec)
Published enggist-summarize-cron (X.XX sec)
  schedule: 0 2 * * * (2 AM UTC daily)
```

### 5. Verify Deployment

#### View Logs

**Ingest Worker:**
```bash
wrangler tail
```

**Summarization Worker:**
```bash
wrangler tail --config wrangler.summarize.toml
```

Keep these running to see real-time logs when the cron triggers.

#### Manual Trigger (for testing)

**Ingest Worker:**
```bash
wrangler dev --test-scheduled
```

**Summarization Worker:**
```bash
wrangler dev --test-scheduled --config wrangler.summarize.toml
```

Or use the Cloudflare dashboard:
1. Go to Workers & Pages
2. Select worker (`enggist-ingest-cron` or `enggist-summarize-cron`)
3. Click "Triggers" tab
4. Click "Trigger" button next to the cron schedule

### 6. Monitor

**Ingest Worker** runs daily at midnight UTC:
```bash
wrangler tail
```

Expected output:
```
[2024-11-10T00:00:00.000Z] Triggering ingest...
Ingest completed: { success: true, sources: [...], totalNew: 45 }
```

**Summarization Worker** runs daily at 2 AM UTC:
```bash
wrangler tail --config wrangler.summarize.toml
```

Expected output:
```
[2024-11-10T02:00:00.000Z] Summarization cron triggered
[2024-11-10T02:00:15.000Z] ✅ Summarization completed: { summarized: 15 }
[2024-11-10T02:00:15.001Z] 💰 Estimated cost: $0.0023 (15 posts, ~30,000 tokens)
```

## Troubleshooting

### Worker Not Triggering

**Check schedule:**
```bash
wrangler deployments list
```

**Verify secrets are set:**
```bash
wrangler secret list
```

Should show:
- `APP_URL`
- `INGEST_SECRET`

### 401 Unauthorized

**Issue**: `INGEST_SECRET` doesn't match between Worker and API.

**Fix**:
1. Check Vercel env var: `INGEST_SECRET`
2. Update Worker secret: `wrangler secret put INGEST_SECRET`

### Connection Timeout

**Issue**: Worker can't reach your API.

**Fix**:
1. Verify `APP_URL` is correct: `wrangler secret list`
2. Ensure your Vercel deployment is live
3. Check API route exists: `curl https://enggist.vercel.app/api/ingest/run`

## Configuration

### Change Cron Schedule

Edit `wrangler.toml`:
```toml
[triggers]
crons = ["0 0 * * *"]  # Once daily at midnight UTC
```

Then redeploy:
```bash
pnpm run deploy
```

### Update Secrets

```bash
wrangler secret put SECRET_NAME
```

Secrets are encrypted and never visible after setting.

## 🛡️ Cost Protection (Summarization Worker)

The summarization worker has multiple layers of protection to prevent unexpected costs:

### Built-in Guardrails:
1. **Hard API Limit**: Max 15 posts per run (enforced in `/api/summarize/run`)
2. **Daily Frequency**: Runs only once per day at 2 AM UTC
3. **No Re-summarization**: Skips posts that already have summaries
4. **No Retry Logic**: Fails gracefully without retry loops
5. **Request Timeout**: 2-minute timeout prevents hanging requests
6. **Cost Logging**: Every run logs estimated cost

### Cost Estimates:
- **Per Run**: ~$0.002 (0.2 cents) for 15 posts
- **Monthly**: ~$0.06 (30 runs)
- **Yearly**: ~$0.73 maximum

### Emergency Stop:
```bash
# Option 1: Kill switch (keeps worker deployed)
wrangler secret put SUMMARIZATION_DISABLED --config wrangler.summarize.toml
# Enter: true

# Option 2: Delete worker entirely
wrangler delete --config wrangler.summarize.toml
```

### Resume:
```bash
# If using kill switch
wrangler secret delete SUMMARIZATION_DISABLED --config wrangler.summarize.toml

# If deleted
pnpm run deploy:summarize
```

📖 **See `SUMMARIZE_SETUP.md` for detailed cost protection documentation.**

## Commands Reference

**Ingest Worker:**
```bash
pnpm run deploy              # Deploy ingest worker
pnpm run test                # Test locally
pnpm run dev                 # Dev server
wrangler tail                # View logs
```

**Summarization Worker:**
```bash
pnpm run deploy:summarize    # Deploy summarize worker
pnpm run test:summarize      # Test locally
pnpm run dev:summarize       # Dev server
wrangler tail --config wrangler.summarize.toml  # View logs
```

**Both Workers:**
```bash
pnpm run deploy:all          # Deploy both workers
```

**General:**
```bash
wrangler deployments list    # List deployments
wrangler secret list         # List secrets (names only)
wrangler secret delete NAME  # Delete a secret
```

## Next Steps

After deployment:
1. ✅ Deploy both workers: `pnpm run deploy:all`
2. ✅ Wait for first automatic triggers (midnight & 2 AM UTC)
3. ✅ Monitor logs: `wrangler tail` and `wrangler tail --config wrangler.summarize.toml`
4. ✅ Verify posts appear in database with summaries
5. ✅ Check `/admin/health` for stats
6. ✅ Review cost logs after first week
