# Enggist

**Engineering blog summaries powered by AI.** Automatically ingest, summarize, and organize articles from top engineering teams.

## Overview

Enggist is an MVP that:
- **Ingests** RSS feeds from engineering blogs (Cloudflare, Netflix, Pinterest, Slack, Airbnb)
- **Summarizes** articles using Google Gemini Flash via Vercel AI SDK
- **Searches** posts with full-text search (Postgres FTS)
- **Displays** clean, responsive UI with summaries, tags, and keywords

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Database**: Supabase (Postgres with PgBouncer)
- **ORM**: Drizzle ORM
- **AI/LLM**: Vercel AI SDK + Google Gemini Flash
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Automation**: Cloudflare Workers (cron jobs)
- **Deployment**: Vercel

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project
- Google Generative AI API key
- Cloudflare account

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

See [SETUP.md](./SETUP.md) for detailed environment variable instructions.

### 4. Run Migrations & Seed Data

```bash
# Apply database migrations
pnpm db:migrate

# Seed RSS sources
pnpm db:seed:sources
```

### 5. **CRITICAL**: Create FTS Index

In Supabase SQL Editor, run:

```sql
CREATE INDEX IF NOT EXISTS posts_search_tsv_idx 
ON posts USING GIN (search_tsv);
```

See [MANUAL_SETUP.md](./MANUAL_SETUP.md) for details.

### 6. Start Dev Server

```bash
pnpm dev
```

Visit http://localhost:3000

### 7. Run First Ingest & Summarize

```bash
# Fetch posts from RSS feeds
curl -X POST http://localhost:3000/api/ingest/run \
  -H "Authorization: Bearer $INGEST_SECRET"

# Generate AI summaries
curl -X POST http://localhost:3000/api/summarize/run \
  -H "Authorization: Bearer $INGEST_SECRET"
```

## Project Structure

```
enggist/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── ingest/run/     # RSS ingestion endpoint
│   │   │   ├── summarize/run/  # AI summarization endpoint
│   │   │   └── search/         # Full-text search endpoint
│   │   ├── tag/[tag]/          # Tag filter page
│   │   ├── company/[id]/       # Company/source page
│   │   ├── post/[id]/          # Post detail page
│   │   ├── search/             # Search UI
│   │   ├── admin/health/       # System health dashboard
│   │   └── page.tsx            # Home page (latest 30 posts)
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── PostCard.tsx        # Post card component
│   ├── db/                     # Database setup
│   │   ├── schema.ts           # Drizzle schema
│   │   └── index.ts            # DB connection
│   └── lib/                    # Utilities
│       ├── auth.ts             # Auth middleware
│       ├── hash.ts             # Content hashing
│       └── queries.ts          # Data fetching
├── workers/                    # Cloudflare Workers
│   └── ingest-cron/            # Cron job (triggers ingest daily)
├── drizzle/                    # Database migrations
├── PLAN.md                     # Implementation plan
├── SETUP.md                    # Detailed setup guide
└── MANUAL_SETUP.md             # Manual steps checklist
```

## Features

### ✅ Implemented

- **RSS Ingestion**: Fetches and deduplicates posts from 5 engineering blogs
- **AI Summarization**: Generates 5-bullet summaries with "why it matters" + tags
- **Full-Text Search**: Fast Postgres FTS with ranking
- **UI Pages**: Home, tag filter, company pages, search, post detail
- **Admin Dashboard**: Health metrics, per-source stats, stale feed detection
- **Cron Automation**: Cloudflare Worker triggers ingest once daily
- **Responsive Design**: Mobile-friendly with Tailwind CSS

### 📋 Controlled Tags

Posts are tagged with one or more of:
- `sre` - Site Reliability Engineering
- `dist` - Distributed Systems
- `data` - Data Engineering
- `mlp` - Machine Learning & AI
- `finops` - FinOps & Cost Optimization
- `security` - Security & Compliance
- `frontend` - Frontend Engineering
- `mobile` - Mobile Development
- `culture` - Engineering Culture

## API Endpoints

### POST `/api/ingest/run`
**Auth**: Bearer token (INGEST_SECRET)  
**Description**: Fetches latest posts from all enabled RSS feeds  
**Returns**: `{ success: true, sources: [...], totalNew: 45 }`

### POST `/api/summarize/run`
**Auth**: Bearer token (INGEST_SECRET)  
**Description**: Generates AI summaries for posts without summaries  
**Returns**: `{ success: true, summarized: 15 }`

### GET `/api/search?q=kafka`
**Auth**: Public  
**Description**: Full-text search across posts  
**Returns**: `{ results: [...], count: 12 }`

### GET `/admin/health`
**Auth**: Bearer token (INGEST_SECRET)  
**Description**: System health metrics and per-source breakdown  
**Returns**: HTML dashboard

## Database Schema

### `sources`
RSS feed sources (Cloudflare, Netflix, etc.)

### `posts`
Blog posts with title, URL, excerpt, published_at, content_hash (for deduplication)

### `summaries`
AI-generated summaries with bullets, whyItMatters, tags, keywords

## Deployment

### Vercel (Next.js App)

1. Connect GitHub repo to Vercel
2. Set environment variables (see SETUP.md)
3. Deploy: `git push origin main`

### Cloudflare Workers (Cron)

```bash
cd workers/ingest-cron
wrangler secret put APP_URL
wrangler secret put INGEST_SECRET
pnpm run deploy
```

## Development Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Lint code

pnpm db:gen           # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio
pnpm db:seed:sources  # Seed RSS sources
```

## Documentation

- **[PLAN.md](./PLAN.md)** - Full implementation plan with phases
- **[SETUP.md](./SETUP.md)** - Detailed setup guide
- **[MANUAL_SETUP.md](./MANUAL_SETUP.md)** - Manual setup checklist
- **[workers/SETUP_INSTRUCTIONS.md](./workers/SETUP_INSTRUCTIONS.md)** - Cloudflare Worker guide

## Monitoring

Visit `/admin/health` (with Bearer token) to see:
- Total posts & summaries
- Posts ingested in last 24h
- Per-source breakdown
- Stale feeds alert

## Contributing

This is an MVP. For production use, consider:
- RLS policies on Supabase
- Rate limiting on API routes
- Caching (Redis)
- More RSS sources
- User authentication
- Bookmarking & collections

## License

MIT
