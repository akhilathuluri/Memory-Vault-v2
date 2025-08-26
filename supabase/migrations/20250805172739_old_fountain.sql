/*
  # Create search_memories RPC function

  1. New Functions
    - `search_memories` - Performs vector similarity search on memories
      - Takes query embedding, similarity threshold, and match count
      - Returns memories with similarity scores
      - Uses cosine similarity for vector comparison

  2. Security
    - Function respects existing RLS policies
    - Only returns memories accessible to the authenticated user
*/

CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.content,
    m.tags,
    m.created_at,
    m.updated_at,
    m.user_id,
    (1 - (m.embedding <=> query_embedding)) as similarity
  FROM memories m
  WHERE 
    m.user_id = auth.uid()
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;