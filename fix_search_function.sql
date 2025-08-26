-- Fix for missing search_memories RPC function
-- Run this in Supabase SQL Editor

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS search_memories(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_memories(vector, float, integer);
DROP FUNCTION IF EXISTS search_memories;

-- Now create the correct function with lower default threshold
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.2,
  match_count int DEFAULT 20
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

-- Verify the function was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'search_memories';
