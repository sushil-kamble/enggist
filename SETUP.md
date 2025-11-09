# Enggist MVP - Setup Guide

## Prerequisites

### Required Tools
- **Node.js**: v20.x or later
- **pnpm**: v9.x or later (install: `npm install -g pnpm`)
- **Supabase Project**: Active project with Postgres database
- **Cloudflare Account**: For Wrangler and Workers
- **Vercel Account**: For deployment (optional for local dev)

### External Accounts & API Keys
1. **Supabase**:
   - Create project at https://supabase.com
   - Note your Project URL and API keys
   - Use pooled connection string (port 6543 for PgBouncer)

2. **Google Generative AI**:
   - Get API key from https://makersuite.google.com/app/apikey
   - This will be used for Gemini Flash via Vercel AI SDK

3. **Cloudflare Workers**:
   - Install Wrangler: `pnpm install -g wrangler`
   - Login: `wrangler login`

---

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# === Supabase ===
# Pooled connection URL (uses PgBouncer on port 6543)
# Format: postgresql://postgres.{PROJECT_REF}:{PASSWORD}@aws-0-{REGION}.pooler.supabase.com:6543/{DB_NAME}?sslmode=require
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?sslmode=require"

# Public Supabase URL (for client-side access)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"

# Anonymous key (safe for client-side; public reads only)
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Service role key (server-side only; never expose to client)
SUPABASE_SERVICE_ROLE="eyJ..."

# === LLM / Summarization ===
# Google Generative AI API key (for Gemini Flash via Vercel AI SDK)
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# === API Security ===
# Shared secret for ingest/summarize/health endpoints
# Generate with: openssl rand -base64 32
INGEST_SECRET="your-random-secret-here"
```

### Getting Your Supabase Credentials

1. **Database URL** (pooled):
   - Go to Project Settings → Database
   - Under "Connection String", select "URI" mode
   - Copy the **"Transaction"** or **"Session"** pooler connection string
   - It should use port `6543` (not 5432)
   - Example: `postgresql://postgres.abc123:pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`

2. **Supabase URL**:
   - Project Settings → API
   - Copy "Project URL"

3. **Anon Key**:
   - Project Settings → API
   - Copy "anon public" key

4. **Service Role Key**:
   - Project Settings → API
   - Copy "service_role" key
   - ⚠️ **Keep this secret!** Never commit or expose to client.

---

## Installation

```bash
# Clone repository
git clone <your-repo-url>
cd enggist

# Install dependencies
pnpm install

# Add missing MVP dependencies (if not already in package.json)
pnpm add ai @ai-sdk/google rss-parser
```

---

## Database Setup

### 1. Run Drizzle Migrations

```bash
# Generate migration files (if schema changed)
pnpm db:gen

# Apply migrations to Supabase
pnpm db:migrate
```

### 2. Verify Tables Exist

Use Supabase dashboard or Drizzle Studio:

```bash
pnpm db:studio
```

You should see:
- `sources` (with 0 rows initially)
- `posts` (with 0 rows)
- `summaries` (with 0 rows)

### 3. Create FTS Index (Required for Search)

Run this SQL in Supabase SQL Editor:

```sql
-- Create GIN index on search_tsv for fast full-text search
CREATE INDEX IF NOT EXISTS posts_search_tsv_idx 
ON posts USING GIN (search_tsv);
```

### 4. Seed RSS Sources

```bash
# Import sources from engineering-blogs.opml
pnpm db:seed:sources
```

Verify in Drizzle Studio that `sources` now has 5 rows (Cloudflare, Netflix, Pinterest, Slack, Airbnb).

---

## Local Development

### Start Dev Server

```bash
pnpm dev
```

Expected output:
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
- Environments: .env.local
```

Visit http://localhost:3000 to see the landing page.

### Check API Routes (After Implementation)

```bash
# Ingest (requires INGEST_SECRET in .env.local)
curl -X POST http://localhost:3000/api/ingest/run \
  -H "Authorization: Bearer $INGEST_SECRET"

# Summarize
curl -X POST http://localhost:3000/api/summarize/run \
  -H "Authorization: Bearer $INGEST_SECRET"

# Search
curl "http://localhost:3000/api/search?q=kafka"

# Health
curl http://localhost:3000/admin/health \
  -H "Authorization: Bearer $INGEST_SECRET"
```

---

## Using MCP Tools

### shadcn MCP - Adding UI Components

The project is pre-configured for shadcn/ui. To add components:

#### Via MCP (in Cascade or compatible AI IDE):
Ask the AI to use `shadcn MCP` to add components:
```
Add card, badge, tabs, pagination, and skeleton components via shadcn MCP
```

#### Manual Alternative:
```bash
pnpm shadcn add card
pnpm shadcn add badge
pnpm shadcn add tabs
pnpm shadcn add pagination
pnpm shadcn add skeleton
pnpm shadcn add separator
```

Components will be added to `src/components/ui/`.

### Context7 MCP - Fetching Docs

When implementing features, use Context7 to get up-to-date docs:

#### Example prompts:
- "Use Context7 MCP to fetch Next.js App Router documentation for route handlers"
- "Get Vercel AI SDK docs for Google provider with structured output"
- "Fetch Tailwind CSS v4 syntax reference"

---

## Cloudflare Worker Setup

### 1. Initialize Worker (First Time Only)

```bash
cd workers/ingest-cron  # Or create this directory

# Initialize Wrangler project
wrangler init
```

### 2. Configure `wrangler.toml`

```toml
name = "enggist-ingest-cron"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 0 * * *"]  # Once daily at midnight UTC
```

### 3. Set Secrets

```bash
# Set your production app URL
wrangler secret put APP_URL
# Enter: https://enggist.vercel.app

# Set ingest secret (same as .env.local)
wrangler secret put INGEST_SECRET
# Enter: <your-secret-from-env>
```

### 4. Deploy Worker

```bash
wrangler deploy
```

### 5. Test Cron Trigger

```bash
# Trigger manually (for testing)
wrangler dev --test-scheduled
```

Expected behavior:
- Worker calls `POST https://enggist.vercel.app/api/ingest/run`
- Server ingests new posts from all enabled feeds

---

## Vercel Deployment

### 1. Connect Repository

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect Next.js

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE
GOOGLE_GENERATIVE_AI_API_KEY
INGEST_SECRET
```

⚠️ **Important**:
- Mark `SUPABASE_SERVICE_ROLE`, `GOOGLE_GENERATIVE_AI_API_KEY`, and `INGEST_SECRET` as **Production** only (not Preview).
- Never expose these in client-side code.

### 3. Deploy

```bash
# Vercel will auto-deploy on git push
git push origin main

# Or manual deploy
vercel --prod
```

---

## Smoke Tests

Run these after MVP implementation to verify everything works:

### 1. Database Verification

```sql
-- Check sources
SELECT name, enabled FROM sources;

-- Check posts exist
SELECT COUNT(*) FROM posts;

-- Check summaries exist
SELECT COUNT(*) FROM summaries;

-- Verify no duplicates
SELECT content_hash, COUNT(*) 
FROM posts 
GROUP BY content_hash 
HAVING COUNT(*) > 1;
```

Expected:
- 5 enabled sources
- Posts > 0 (after first ingest)
- Summaries > 0 (after first summarize run)
- No duplicates

### 2. API Endpoint Tests

```bash
# Store your production URL and secret
export APP_URL="https://enggist.vercel.app"
export INGEST_SECRET="your-secret-here"

# Test ingest
curl -X POST $APP_URL/api/ingest/run \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -w "\nHTTP %{http_code}\n"

# Expected: HTTP 200 with JSON response showing new posts

# Test summarize
curl -X POST $APP_URL/api/summarize/run \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -w "\nHTTP %{http_code}\n"

# Expected: HTTP 200 with count of summarized posts

# Test search
curl "$APP_URL/api/search?q=kafka" | jq .

# Expected: JSON array of search results

# Test health (admin)
curl $APP_URL/admin/health \
  -H "Authorization: Bearer $INGEST_SECRET" | jq .

# Expected: JSON with last_run, 24h_counts, stale_feeds
```

### 3. UI Manual Tests

1. **Home Page** (`/`):
   - Loads 30 latest posts
   - Shows source name, date, bullets, why-it-matters
   - Tags rendered as badges

2. **Tag Filter** (`/tag/sre`):
   - Shows only posts tagged "sre"

3. **Company Page** (`/company/[id]`):
   - Shows only posts from that source

4. **Search** (`/search?q=kubernetes`):
   - Returns relevant results
   - Fast response (<500ms)

5. **Post Detail** (`/post/[id]`):
   - Shows full summary
   - "Read original" link works

6. **Admin Health** (`/admin/health`):
   - Protected (401 without token)
   - Shows last run, counts, stale feeds

### 4. Cloudflare Worker Verification

```bash
# Check worker logs
wrangler tail

# Expected: Once daily at midnight UTC, see POST request to /api/ingest/run
```

---

## Development Scripts

```bash
# Start Next.js dev server
pnpm dev

# Build for production
pnpm build

# Start production server (after build)
pnpm start

# Generate Drizzle migration
pnpm db:gen

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Seed sources from OPML
pnpm db:seed:sources

# Lint code
pnpm lint
```

---

## Troubleshooting

### Database Connection Issues

**Error**: `Error: connect ETIMEDOUT`

**Fix**:
- Ensure `DATABASE_URL` uses the **pooled** connection string (port 6543)
- Verify IP allowlisting in Supabase (Project Settings → Database → Connection Pooling)
- Check `sslmode=require` is in connection string

### Vercel AI SDK Errors

**Error**: `Error: API key not found`

**Fix**:
- Verify `GOOGLE_GENERATIVE_AI_API_KEY` is set in `.env.local`
- Ensure key is valid (test in Google AI Studio)
- For Vercel deployment, check env var is set in dashboard

### Cloudflare Worker Not Triggering

**Fix**:
- Verify cron schedule in `wrangler.toml`: `crons = ["*/45 * * * *"]`
- Check worker logs: `wrangler tail`
- Manually trigger: `wrangler dev --test-scheduled`

### Search Returns No Results

**Fix**:
- Verify FTS index exists:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'posts' AND indexname = 'posts_search_tsv_idx';
  ```
- If missing, create it (see "Database Setup" section)
- Verify `search_tsv` trigger is active:
  ```sql
  SELECT tgname FROM pg_trigger WHERE tgrelid = 'posts'::regclass;
  ```

### Posts Not Appearing After Ingest

**Check**:
1. Run ingest manually and check response:
   ```bash
   curl -X POST localhost:3000/api/ingest/run \
     -H "Authorization: Bearer $INGEST_SECRET" -v
   ```
2. Verify feed URLs are accessible:
   ```bash
   curl -I https://blog.cloudflare.com/rss/
   ```
3. Check for errors in Next.js console
4. Verify `content_hash` uniqueness isn't blocking valid posts:
   ```sql
   SELECT content_hash, COUNT(*) FROM posts GROUP BY content_hash HAVING COUNT(*) > 1;
   ```

---

## Next Steps

After completing setup:

1. ✅ Verify all smoke tests pass
2. ✅ Run first ingest manually
3. ✅ Generate summaries for new posts
4. ✅ Test search with various queries
5. ✅ Verify Cloudflare Worker triggers on schedule
6. 🚀 Monitor production for 24 hours
7. 📊 Check `/admin/health` for any stale feeds

---

## Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Supabase**: https://supabase.com/docs
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE` never exposed to client
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` only used server-side
- [ ] `INGEST_SECRET` is random and secure (≥32 characters)
- [ ] All admin routes protected by header token
- [ ] Database uses pooled connection with `{ max: 1, prepare: false }`
- [ ] RLS policies configured (optional for MVP; all data is public)
- [ ] HTTPS enforced in production
- [ ] No sensitive data in logs

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0 (MVP)
