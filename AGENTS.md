# Enggist Agent Notes

Concise project guide for any AI coding agent working in this repo.

## Stack
- Next.js 16 App Router
- React 19
- Drizzle ORM + Postgres
- Tailwind CSS v4
- React Icons

## Source Map (Most Important Files)
- `/Users/sushil/Projects/React/enggist/src/lib/queries.ts`
  - Core read queries, pagination, cache, related posts.
- `/Users/sushil/Projects/React/enggist/src/db/index.ts`
  - DB client setup; uses singleton pattern for dev/HMR stability.
- `/Users/sushil/Projects/React/enggist/src/app/api/search/route.ts`
  - Search API logic and ranking.
- `/Users/sushil/Projects/React/enggist/src/components/SearchablePosts.tsx`
  - Search UX, URL sync, sorting, pagination transitions, skeleton behavior.
- `/Users/sushil/Projects/React/enggist/src/components/PostCard.tsx`
  - Listing card design and footer/tags styling.
- `/Users/sushil/Projects/React/enggist/src/app/post/[id]/page.tsx`
  - Post details layout, back button usage, related posts section.
- `/Users/sushil/Projects/React/enggist/src/app/post/[id]/loading.tsx`
  - Post-specific skeleton loader.
- `/Users/sushil/Projects/React/enggist/src/app/loading.tsx`
  - Global fallback loading UI.
- `/Users/sushil/Projects/React/enggist/drizzle/*.sql`
  - SQL migrations and index maintenance.

## Product and UX Expectations
- Keep UI dense, modern, and consistent; avoid oversized gaps.
- Preserve current theme/style direction; iterate instead of redesigning from scratch.
- Prefer subtle highlighting over loud pills/borders.
- Hashtags should render with `#tag`.
- Avoid noisy/box-heavy layouts.
- Post page should feel readable and compact.

## Data and Performance Rules
- Do not fetch `posts.content` for list/grid pages.
- Keep expensive operations out of initial page load when possible.
- Use `unstable_cache` for repeated server queries (with sensible `revalidate` and tags).
- Search API should short-circuit very short queries.
- Sorting/search interactions should show loading skeletons.
- Keep URL query params as source of truth for search/shareability.

## Known Pitfalls
- Hydration mismatch can be caused by browser extensions; confirm before code changes.
- Date formatting can cause SSR/client mismatch; use explicit timezone where needed (UTC is used in key places).
- `unstable_cache` cannot be tested directly in plain standalone scripts; verify through app runtime/build.

## Database Index Notes
- Existing duplicate indexes were cleaned up:
  - dropped `posts_published_idx` (duplicate of `posts_published_at_idx`)
  - dropped `posts_search_idx` (duplicate of `posts_search_tsv_idx`)
- Keep migration record:
  - `/Users/sushil/Projects/React/enggist/drizzle/0004_drop_duplicate_indexes.sql`

## Fast Verification Workflow
1. Run lint on touched files.
   - `pnpm eslint <files>`
2. Run full build.
   - `pnpm build`
3. Manually verify key UX flows:
   - Search updates URL on submit.
   - Clearing search removes query param and resets results.
   - Search/sort show loading skeletons.
   - Opening a post shows post-specific skeleton, then detail page.
   - Back button works from post details.
   - Related posts render on post details.

## Working Style
- Make minimal targeted changes.
- Verify immediately after each logical change.
- Prefer query/runtime proof over assumptions.
- Keep changes reproducible (migrations for DB changes).
