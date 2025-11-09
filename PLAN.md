# Enggist MVP - Execution Plan

## Current State Report

### ✅ Confirmed Working
- **Database Tables**: `sources`, `posts`, `summaries` exist in Supabase with correct schema
- **Drizzle Migrations**: Applied successfully (0000_flaky_quasimodo.sql)
- **Sources Seeded**: 5 enabled feeds in database:
  - Cloudflare Blog
  - Netflix Tech Blog
  - Pinterest Engineering
  - Slack Engineering
  - Airbnb Engineering
- **UI Compiles**: Next.js build succeeds; basic landing page renders
- **Drizzle Setup**: Connection configured with postgres-js
- **FTS Trigger**: `posts_tsvector_update` trigger exists to maintain search_tsv
- **Deduplication**: Unique index on `content_hash` for posts

### ⚠️ Gaps Identified
- **Missing FTS Index**: No GIN index on `posts.search_tsv` for fast search
- **Missing Env Vars**:
  - `SUPABASE_SERVICE_ROLE` (for server-side writes)
  - `GOOGLE_GENERATIVE_AI_API_KEY` (for LLM summarization)
  - `INGEST_SECRET` (for API auth)
- **Missing Dependencies**:
  - Vercel AI SDK (`ai` package)
  - Google Generative AI provider (`@ai-sdk/google`)
  - RSS parser (e.g., `rss-parser` or `fast-xml-parser`)
- **No API Routes**: `/api/ingest/run`, `/api/summarize/run`, `/api/search` don't exist
- **No Cloudflare Worker cron job (once daily at midnight UTC) set up**
- **Database Connection**: Current setup doesn't use pooled connection with `{ max: 1, prepare: false }` as required
- **No Admin Pages**: `/admin/health` route missing
- **No Content Pages**: Home feed, tag pages, company pages, search UI missing
- **No shadcn Components**: Only `button` component exists; need Card, Badge, Tabs, Pagination, Skeleton

---

## MVP Scope

### Ingest Pipeline
For each enabled feed:
1. Fetch RSS with conditional headers (`If-None-Match`, `If-Modified-Since`)
2. Parse and normalize latest ~50 items
3. Deduplicate by `content_hash` (SHA-256 of `url + title + published_at`)
4. Store: `title`, `url`, `excerpt`, `published_at`, `author`, `source_id`
5. Use `on conflict (content_hash) do nothing`
6. Update source's `last_etag`, `last_modified`
7. Log per-source ingestion counts

### Summarizer (Vercel AI SDK + Google Flash)
1. Query recent posts without summaries (limit 15)
2. For each post, call Google Flash via Vercel AI SDK with structured output:
   ```json
   {
     "bullets": ["point 1", "point 2", "point 3", "point 4", "point 5"],
     "whyItMatters": "1-2 sentence explanation",
     "tags": ["sre", "dist"],
     "keywords": ["kafka", "streaming", "partition"]
   }
   ```
3. Controlled tags: `['sre','dist','data','mlp','finops','security','frontend','mobile','culture']`
4. Store summary with `model: "google-flash"`

### Search (Postgres FTS)
- Full-text search on `title` + `excerpt` using `search_tsv`
- Query: `WHERE search_tsv @@ plainto_tsquery('english', $query)`
- Rank by `ts_rank(search_tsv, plainto_tsquery('english', $query))`
- Join with `sources` to include company name
- Return top 50 results

### UI Pages
1. **Home (`/`)**: Latest 30 posts with source, date, summary bullets, "why it matters", tags
2. **Tag Filter (`/tag/[tag]`)**: Posts filtered by tag
3. **Company Page (`/company/[id]`)**: Posts from specific source
4. **Search (`/search`)**: Full-text search interface
5. **Article Page (`/post/[id]`)**: Full summary + "Read original" link
6. **Admin Health (`/admin/health`)**: Protected by header token
   - Last ingest run timestamp
   - Posts created in last 24h (per source)
   - Feeds with zero items in last 7 days

### Admin & Observability
- `/admin/health` protected by `Authorization: Bearer ${INGEST_SECRET}`
- Minimal logging (console.log with timestamps)
- Optional: `ingest_events` table for run history

---

## Architecture

```
┌──────────────────┐
│ Cloudflare Worker│
│  (Cron: daily) │
└────────┬─────────┘
         │ POST /api/ingest/run
         │ (Bearer token)
         ▼
┌─────────────────────────────────────────┐
│         Next.js App Router              │
├─────────────────────────────────────────┤
│  API Routes:                            │
│   • /api/ingest/run    (auth: header)   │
│   • /api/summarize/run (auth: header)   │
│   • /api/search        (public)         │
├─────────────────────────────────────────┤
│  UI Pages:                              │
│   • /                  (latest 30)      │
│   • /tag/[tag]         (filtered)       │
│   • /company/[id]      (by source)      │
│   • /search            (FTS)            │
│   • /post/[id]         (detail)         │
│   • /admin/health      (auth: header)   │
└──────────────┬──────────────────────────┘
               │ Drizzle ORM
               ▼
┌──────────────────────────────────────────┐
│      Supabase (Postgres)                 │
│  Tables: sources, posts, summaries       │
│  FTS: search_tsv (GIN index)             │
│  Pooled connection (port 6543)           │
└──────────────────────────────────────────┘
               ▲
               │
         Vercel AI SDK
         Google Flash
         (Summarization)
```

---

## Data Contracts

### `sources` Table
Required fields:
- `id` (uuid, PK)
- `name` (text, not null)
- `site` (text, not null)
- `feed_url` (text, not null, unique)
- `category` (enum, default 'culture')
- `enabled` (boolean, default true)
- `last_seen_item_hash` (text, nullable)
- `last_etag` (text, nullable)
- `last_modified` (text, nullable)
- `created_at` (timestamptz, not null)

### `posts` Table
Required fields:
- `id` (uuid, PK)
- `source_id` (uuid, FK → sources.id, cascade)
- `title` (text, not null)
- `url` (text, not null)
- `canonical_url` (text, nullable)
- `published_at` (timestamptz, nullable)
- `author` (text, nullable)
- `excerpt` (text, nullable)
- `content_hash` (text, not null, unique)
- `search_tsv` (tsvector, nullable, auto-maintained)
- `created_at` (timestamptz, not null)

### `summaries` Table
Required fields:
- `id` (uuid, PK)
- `post_id` (uuid, FK → posts.id, cascade)
- `bullets_json` (jsonb, not null) — array of 5 strings
- `why_it_matters` (text, nullable)
- `tags` (text[], default '{}')
- `keywords` (text[], default '{}')
- `model` (text, nullable)
- `created_at` (timestamptz, not null)

### API Endpoint: POST `/api/ingest/run`
**Auth**: `Authorization: Bearer ${INGEST_SECRET}`

**Response**:
```json
{
  "success": true,
  "sources": [
    {
      "name": "Cloudflare Blog",
      "new": 12,
      "skipped": 38
    }
  ],
  "totalNew": 45
}
```

### API Endpoint: POST `/api/summarize/run`
**Auth**: `Authorization: Bearer ${INGEST_SECRET}`

**Response**:
```json
{
  "success": true,
  "summarized": 15
}
```

### API Endpoint: GET `/api/search?q=kafka`
**Auth**: Public

**Response**:
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Scaling Kafka at Cloudflare",
      "url": "https://...",
      "source": "Cloudflare Blog",
      "publishedAt": "2024-01-15T10:30:00Z",
      "excerpt": "...",
      "summary": {
        "bullets": ["..."],
        "whyItMatters": "...",
        "tags": ["dist", "data"]
      }
    }
  ],
  "count": 12
}
```

### Controlled Tags
```typescript
type Tag = 'sre' | 'dist' | 'data' | 'mlp' | 'finops' | 'security' | 'frontend' | 'mobile' | 'culture';
```

---

## Tooling & MCP Usage

### Sequential Thinking MCP
Use for multi-step reasoning:
- Breaking down complex implementation (e.g., ingest flow)
- Planning error handling and edge cases
- Verifying implementation completeness

### shadcn MCP
Required components to add:
```bash
card        # Post cards on home/tag pages
badge       # Tag badges
tabs        # Admin health tabs (per-source breakdown)
pagination  # Home page pagination
skeleton    # Loading states
separator   # Visual dividers
```

### Context7 MCP
Fetch latest documentation for:
- Next.js App Router (RSC, route handlers)
- Vercel AI SDK (Google provider, structured output)
- Drizzle ORM (postgres-js adapter, query patterns)
- Tailwind CSS v4 (new syntax)

### Supabase MCP
- **Server routes only** for writes (use SERVICE_ROLE key)
- **Client reads** via ANON_KEY (public data)
- Run migrations via `mcp3_apply_migration`
- Check advisors regularly: `mcp3_get_advisors({ type: 'security' })`

---

## Acceptance Criteria

### Ingest
- [ ] Fetches all 5 feeds without errors
- [ ] Deduplicates by `content_hash`
- [ ] Respects `If-None-Match`/`If-Modified-Since` headers
- [ ] Updates `last_etag`, `last_modified` per source
- [ ] Logs per-source counts (new/skipped)
- [ ] Posts table grows over time (no duplicates)

### Summarizer
- [ ] Generates summaries via Vercel AI SDK + Google Flash
- [ ] All summaries have 5 bullets (≤120 words total)
- [ ] Tags are from controlled list only
- [ ] Keywords extracted (3-5 per post)
- [ ] `why_it_matters` present and concise

### Search
- [ ] Returns relevant results for common queries ("kafka", "kubernetes", "react")
- [ ] Fast query times (<200ms)
- [ ] Ranked by relevance (ts_rank)
- [ ] Joins source name correctly

### UI
- [ ] Home page shows 30 latest posts
- [ ] Each card displays: title, source, date, bullets, why-it-matters, tags
- [ ] "Read original" links to external article
- [ ] Tag filter works (`/tag/sre` shows only SRE posts)
- [ ] Company page works (`/company/[id]` shows only that source)
- [ ] Search page works (input → results)
- [ ] Responsive design (mobile-friendly)

### Admin
- [ ] `/admin/health` protected by header token
- [ ] Shows last ingest run timestamp
- [ ] Shows 24h post counts (total + per-source breakdown)
- [ ] Highlights feeds with zero items in last 7 days

---

## Test Plan

### SQL Verification
```sql
-- Check for duplicates
SELECT content_hash, COUNT(*) 
FROM posts 
GROUP BY content_hash 
HAVING COUNT(*) > 1;

-- Check for null titles
SELECT COUNT(*) FROM posts WHERE title IS NULL OR title = '';

-- Per-source counts
SELECT s.name, COUNT(p.id) as post_count
FROM sources s
LEFT JOIN posts p ON p.source_id = s.id
GROUP BY s.id, s.name
ORDER BY post_count DESC;

-- Posts without summaries
SELECT COUNT(*) FROM posts p
LEFT JOIN summaries s ON s.post_id = p.id
WHERE s.id IS NULL;

-- Tag distribution
SELECT unnest(tags) as tag, COUNT(*) as count
FROM summaries
GROUP BY tag
ORDER BY count DESC;
```

### API Tests (curl)
```bash
# Ingest
curl -X POST https://enggist.vercel.app/api/ingest/run \
  -H "Authorization: Bearer $INGEST_SECRET"

# Summarize
curl -X POST https://enggist.vercel.app/api/summarize/run \
  -H "Authorization: Bearer $INGEST_SECRET"

# Search
curl "https://enggist.vercel.app/api/search?q=kafka"

# Health
curl https://enggist.vercel.app/admin/health \
  -H "Authorization: Bearer $INGEST_SECRET"
```

### Manual UI Tests
1. Load `/` → verify 30 posts render
2. Click tag badge → verify `/tag/[tag]` filters correctly
3. Click source name → verify `/company/[id]` shows only that source
4. Use search bar → verify results appear
5. Click post title → verify `/post/[id]` shows full summary
6. Verify mobile responsive (viewport 375px)

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Add missing dependencies (`ai`, `@ai-sdk/google`, `rss-parser`)
- [ ] Update database connection to use pooled config
- [ ] Add missing env vars to `.env.local`
- [ ] Create FTS GIN index on `posts.search_tsv`
- [ ] Add shadcn components (card, badge, tabs, pagination, skeleton, separator)

### Phase 2: Ingest API
- [ ] Create `/api/ingest/run` route handler
- [ ] Implement auth middleware (header token check)
- [ ] Implement RSS fetching with conditional headers
- [ ] Implement content hash generation
- [ ] Implement deduplication logic
- [ ] Test with curl

### Phase 3: Cloudflare Worker
- [ ] Initialize Wrangler project
- [ ] Configure cron schedule (*/45 * * * *)
- [ ] Add secrets (APP_URL, INGEST_SECRET)
- [ ] Implement POST to `/api/ingest/run`
- [ ] Deploy and test

### Phase 4: Summarizer API
- [ ] Create `/api/summarize/run` route handler
- [ ] Configure Vercel AI SDK with Google provider
- [ ] Implement structured output schema
- [ ] Implement tag validation (controlled list)
- [ ] Test with sample posts

### Phase 5: Search API
- [ ] Create `/api/search` route handler
- [ ] Implement FTS query with ranking
- [ ] Join with sources table
- [ ] Return formatted results
- [ ] Test with various queries

### Phase 6: UI Pages
- [ ] Implement `/` (home feed with pagination)
- [ ] Implement `/tag/[tag]` (filtered by tag)
- [ ] Implement `/company/[id]` (filtered by source)
- [ ] Implement `/search` (search interface)
- [ ] Implement `/post/[id]` (detail page)
- [ ] Style all pages with Tailwind + shadcn components

### Phase 7: Admin & Health
- [ ] Create `/admin/health` page
- [ ] Implement auth middleware
- [ ] Query last run timestamp (from ingest_events or file/cache)
- [ ] Calculate 24h post counts
- [ ] Identify stale feeds (zero items in 7d)
- [ ] Display in clean dashboard layout

### Phase 8: Hardening
- [ ] Add error handling (try/catch, backoff on 429/5xx)
- [ ] Add request timeouts
- [ ] Validate env vars on startup
- [ ] Add basic logging (timestamps, source names, counts)
- [ ] Run security advisors (Supabase MCP)
- [ ] Performance test (ingest + summarize 100 posts)

### Phase 9: Documentation & Deployment
- [ ] Complete SETUP.md
- [ ] Verify all smoke tests pass
- [ ] Deploy to Vercel (production)
- [ ] Configure Cloudflare Worker (production cron)
- [ ] Monitor first 24h of operation

---

## Known Constraints
- **No OpenAI**: Use Google Flash exclusively
- **Server-only LLM calls**: Never expose API keys to client
- **Pooled connections**: PgBouncer (port 6543) with `{ max: 1, prepare: false }`
- **Controlled tags**: Hardcoded list; reject others during summarization
- **Minimal dependencies**: Prefer built-in Next.js features over external libs
- **No auth for reads**: All post/search data is public
- **Header token auth**: Simple Bearer token for ingest/summarize/health

---

## Success Metrics (Post-MVP)
- [ ] Ingest runs daily without failures
- [ ] New posts appear within 1 hour of publication
- [ ] Search responds in <200ms for 95th percentile
- [ ] Zero duplicate posts in database
- [ ] All posts have summaries within 2 hours of ingestion
- [ ] Tags match controlled list (100% compliance)
