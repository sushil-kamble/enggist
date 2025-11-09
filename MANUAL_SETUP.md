# Manual Setup Required

These steps must be completed manually as they cannot be automated via code.

## 1. Database: Create FTS Index ⚠️ CRITICAL

The full-text search GIN index must be created in Supabase for search to work.

### Steps:
1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
CREATE INDEX IF NOT EXISTS posts_search_tsv_idx 
ON posts USING GIN (search_tsv);
```

3. Verify the index was created:

```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'posts' AND indexname = 'posts_search_tsv_idx';
```

Expected result: One row showing `posts_search_tsv_idx`

---

## 2. Environment Variables

### Local Development (`.env.local`)

Create `.env.local` in project root:

```bash
# Supabase (use pooled connection on port 6543)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE="eyJ..."

# Google Generative AI (for summaries)
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# API Security (generate with: openssl rand -base64 32)
INGEST_SECRET="your-random-secret-here"
```

### Production (Vercel)

Set these in Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL` (Production only)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE` (Production only, keep secret!)
- `GOOGLE_GENERATIVE_AI_API_KEY` (Production only, keep secret!)
- `INGEST_SECRET` (Production only)

---

## 3. Cloudflare Worker

### Set Secrets

```bash
cd workers/ingest-cron

# Set production app URL
wrangler secret put APP_URL
# Enter: https://enggist.vercel.app

# Set ingest secret (same as .env.local)
wrangler secret put INGEST_SECRET
# Enter: <your-secret>
```

### Deploy

```bash
pnpm run deploy
```

---

## 4. First-Time Data Setup

### Seed RSS Sources

```bash
pnpm db:seed:sources
```

This imports the 5 sources from `engineering-blogs.opml`.

### Run First Ingest

```bash
curl -X POST http://localhost:3000/api/ingest/run \
  -H "Authorization: Bearer $INGEST_SECRET"
```

Expected: JSON response with `totalNew` > 0

### Generate Summaries

```bash
curl -X POST http://localhost:3000/api/summarize/run \
  -H "Authorization: Bearer $INGEST_SECRET"
```

Expected: JSON response with `summarized` > 0

---

## 5. Verify Everything Works

### Check Database

```sql
-- Should have 5 sources
SELECT COUNT(*) FROM sources;

-- Should have posts
SELECT COUNT(*) FROM posts;

-- Should have summaries
SELECT COUNT(*) FROM summaries;

-- Check for duplicates (should be 0)
SELECT content_hash, COUNT(*) 
FROM posts 
GROUP BY content_hash 
HAVING COUNT(*) > 1;
```

### Check UI

1. Visit http://localhost:3000
2. Should see posts on home page
3. Click a tag → should filter by tag
4. Click source name → should show only that source
5. Click search → should return results
6. Click post title → should show full summary

### Check Admin

```bash
curl http://localhost:3000/admin/health \
  -H "Authorization: Bearer $INGEST_SECRET" | jq
```

Should show:
- Total posts count
- 24h posts count
- Summaries count
- Per-source breakdown

---

## 6. Production Deployment

### Deploy to Vercel

```bash
git push origin main
```

Vercel will auto-deploy. Verify:
- https://enggist.vercel.app/ loads
- All env vars are set in dashboard

### Deploy Cloudflare Worker

```bash
cd workers/ingest-cron
wrangler secret put APP_URL
# Enter: https://enggist.vercel.app

wrangler secret put INGEST_SECRET
# Enter: <production-secret>

pnpm run deploy
```

### Monitor First Cron Run

```bash
wrangler tail
```

Wait for cron trigger (once daily at midnight UTC). Should see:
```
Triggering ingest...
Ingest completed: {...}
```

---

## Troubleshooting

### Search Returns No Results

**Cause**: FTS index not created

**Fix**: Run the SQL from step 1

### Ingest Fails with "Unauthorized"

**Cause**: `INGEST_SECRET` mismatch

**Fix**: Ensure secret matches in `.env.local` and Cloudflare Worker

### Summarize Fails with "API key not configured"

**Cause**: Missing `GOOGLE_GENERATIVE_AI_API_KEY`

**Fix**: Add to `.env.local` or Vercel env vars

### Worker Not Triggering

**Cause**: Secrets not set or incorrect URL

**Fix**: 
```bash
wrangler secret list
```

Should show `APP_URL` and `INGEST_SECRET`

---

## Next Steps

After completing all manual setup:

1. ✅ Verify FTS index exists
2. ✅ Run first ingest + summarize
3. ✅ Test all UI pages
4. ✅ Deploy to Vercel
5. ✅ Deploy Cloudflare Worker
6. ✅ Monitor health dashboard for 24h

**Success Criteria**: 
- Cron runs daily without errors
- New posts appear automatically
- Search is fast (<200ms)
- All summaries have proper tags
