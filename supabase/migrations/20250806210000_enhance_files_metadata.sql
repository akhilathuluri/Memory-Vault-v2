-- Add metadata fields to files table for enhanced search capabilities
-- This migration adds description, tags, and embedding fields to support semantic search

-- Add new columns to files table
ALTER TABLE files 
ADD COLUMN description text,
ADD COLUMN tags text[] DEFAULT '{}',
ADD COLUMN embedding vector(1536);

-- Create index for embedding search
CREATE INDEX IF NOT EXISTS files_embedding_idx ON files USING ivfflat (embedding vector_cosine_ops);

-- Create index for tags
CREATE INDEX IF NOT EXISTS files_tags_idx ON files USING gin(tags);

-- Create index for text search on name and description
CREATE INDEX IF NOT EXISTS files_text_search_idx ON files USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Create search function for files (similar to search_memories)
CREATE OR REPLACE FUNCTION search_files(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  tags text[],
  file_path text,
  file_type text,
  file_size integer,
  created_at timestamptz,
  user_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.description,
    f.tags,
    f.file_path,
    f.file_type,
    f.file_size,
    f.created_at,
    f.user_id,
    (1 - (f.embedding <=> query_embedding)) as similarity
  FROM files f
  WHERE 
    f.user_id = auth.uid()
    AND f.embedding IS NOT NULL
    AND (1 - (f.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
