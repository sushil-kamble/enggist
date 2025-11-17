-- ===========================================================
-- Enggist Search Setup (Full-Text + Fuzzy + Weighted Search)
-- Recursion-safe version
-- ===========================================================

--------------------------------------------------------------
-- 1) Enable pg_trgm (fuzzy search)
--------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

--------------------------------------------------------------
-- 2) Ensure search_tsv column exists
--------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

--------------------------------------------------------------
-- 3) Indexes for fast search
--------------------------------------------------------------

-- Full-text search GIN index
CREATE INDEX IF NOT EXISTS posts_search_tsv_idx 
ON public.posts USING GIN (search_tsv);

-- Fuzzy title search index
CREATE INDEX IF NOT EXISTS posts_title_trgm_idx
ON public.posts USING GIN (title gin_trgm_ops);

-- summaries → posts join index
CREATE INDEX IF NOT EXISTS summaries_post_id_idx
ON public.summaries (post_id);

--------------------------------------------------------------
-- 4) Main search_tsv builder (WEIGHTED)
--------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_post_search_tsv(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title        text;
  v_excerpt      text;
  v_content      text;
  v_author       text;
  v_source_name  text;
  v_why          text;
  v_bullets      text;
  v_tags         text;
  v_keywords     text;
  v_tsv          tsvector;
BEGIN
  -- Pull post + summary + source into variables
  SELECT
    p.title,
    p.excerpt,
    p.content,
    p.author,
    src.name AS source_name,
    su.why_it_matters,
    (
      SELECT string_agg(b, ' ')
      FROM jsonb_array_elements_text(su.bullets_json) AS b
    ) AS bullets_text,
    array_to_string(COALESCE(su.tags, '{}'::text[]), ' ') AS tags_text,
    array_to_string(COALESCE(su.keywords, '{}'::text[]), ' ') AS keywords_text
  INTO
    v_title,
    v_excerpt,
    v_content,
    v_author,
    v_source_name,
    v_why,
    v_bullets,
    v_tags,
    v_keywords
  FROM public.posts p
  LEFT JOIN public.summaries su ON su.post_id = p.id
  LEFT JOIN public.sources src ON src.id = p.source_id
  WHERE p.id = p_post_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Weighted TSV construction
  v_tsv :=
    setweight(to_tsvector('english', COALESCE(v_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(v_why, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(v_source_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(v_tags, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(v_keywords, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(v_excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(v_bullets, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(v_content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(v_author, '')), 'C');

  -- IMPORTANT: Avoid recursive trigger re-fire
  UPDATE public.posts
  SET search_tsv = v_tsv
  WHERE id = p_post_id
    AND search_tsv IS DISTINCT FROM v_tsv;  -- only update if changed
END;
$$;

--------------------------------------------------------------
-- 5) Trigger wrapper functions (no args allowed)
--------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_post_search_tsv_from_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_post_search_tsv(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_post_search_tsv_from_summaries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_post_search_tsv(NEW.post_id);
  RETURN NEW;
END;
$$;

--------------------------------------------------------------
-- 6) Recursion-safe triggers
--------------------------------------------------------------

-- Fire only when meaningful fields change
DROP TRIGGER IF EXISTS posts_search_tsv_refresh ON public.posts;
CREATE TRIGGER posts_search_tsv_refresh
AFTER INSERT OR UPDATE OF title, excerpt, content, author, source_id
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.refresh_post_search_tsv_from_posts();

DROP TRIGGER IF EXISTS summaries_search_tsv_refresh ON public.summaries;
CREATE TRIGGER summaries_search_tsv_refresh
AFTER INSERT OR UPDATE OF why_it_matters, bullets_json, tags, keywords
ON public.summaries
FOR EACH ROW
EXECUTE FUNCTION public.refresh_post_search_tsv_from_summaries();

--------------------------------------------------------------
-- 7) Backfill all tsvectors (SINGLE PASS, no recursion)
--------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.posts LOOP
    PERFORM public.refresh_post_search_tsv(r.id);
  END LOOP;
END;
$$;

-- ===========================================================
-- END OF SCRIPT — SAFE & OPTIMIZED
-- ===========================================================
