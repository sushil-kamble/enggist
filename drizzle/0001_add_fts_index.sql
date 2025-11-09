-- Create GIN index on search_tsv for fast full-text search
CREATE INDEX IF NOT EXISTS posts_search_tsv_idx 
ON posts USING GIN (search_tsv);
