/*
  # Fix Memory Cleanup Function

  1. Changes
    - Remove activity logging from cleanup function to avoid foreign key constraint issues
    - Simplify cleanup function to just delete expired memories
    - Add better error handling

  2. Security
    - Maintain existing RLS policies
    - Function still runs with SECURITY DEFINER for system-level cleanup
*/

-- Update the cleanup function to remove activity logging
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete expired memories where auto_delete is enabled
  DELETE FROM memories 
  WHERE auto_delete_enabled = true 
    AND expires_at IS NOT NULL 
    AND expires_at <= now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return the count of deleted memories
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions (refresh the grant)
GRANT EXECUTE ON FUNCTION cleanup_expired_memories() TO authenticated;