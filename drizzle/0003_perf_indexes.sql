-- Performance indexes for read-heavy feed and search views

-- Feed sorting and "last indexed" lookups
CREATE INDEX IF NOT EXISTS posts_created_at_idx
ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS posts_published_at_idx
ON posts (published_at DESC);

-- Company feed pagination (source filter + recency sort)
CREATE INDEX IF NOT EXISTS posts_source_published_created_idx
ON posts (source_id, published_at DESC, created_at DESC);

-- Tag feed lookups on summaries.tags (ANY(tags))
CREATE INDEX IF NOT EXISTS summaries_tags_gin_idx
ON summaries USING GIN (tags);

-- Alpha sorting helpers
CREATE INDEX IF NOT EXISTS posts_title_lower_idx
ON posts (LOWER(title));

CREATE INDEX IF NOT EXISTS sources_name_lower_idx
ON sources (LOWER(name));
