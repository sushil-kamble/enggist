-- Remove legacy duplicate indexes.
-- Keep canonical names used by current migrations:
--   - posts_published_at_idx
--   - posts_search_tsv_idx

DROP INDEX IF EXISTS public.posts_published_idx;
DROP INDEX IF EXISTS public.posts_search_idx;
