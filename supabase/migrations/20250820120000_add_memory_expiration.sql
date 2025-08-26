/*
  # Add Self-Destruct Memory Feature

  1. Changes
    - Add `expires_at` column to memories table for auto-deletion
    - Add `auto_delete_enabled` column to control per-memory expiration
    - Create function to clean up expired memories
    - Create scheduled job to run cleanup periodically

  2. Security
    - Maintain existing RLS policies
    - Only allow users to set expiration on their own memories
*/

-- Add expiration columns to memories table
ALTER TABLE memories 
ADD COLUMN expires_at timestamptz,
ADD COLUMN auto_delete_enabled boolean DEFAULT false;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS memories_expires_at_idx ON memories(expires_at) WHERE expires_at IS NOT NULL;

-- Create function to clean up expired memories
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
  
  -- Log the cleanup activity
  INSERT INTO activity_logs (action, resource_type, created_at, user_id)
  SELECT 
    'auto_deleted_expired',
    'memory',
    now(),
    '00000000-0000-0000-0000-000000000000'::uuid -- System user for cleanup logs
  WHERE deleted_count > 0;
  
  RETURN deleted_count;
END;
$$;

-- Create a function to set memory expiration
CREATE OR REPLACE FUNCTION set_memory_expiration(
  memory_id uuid,
  expiration_hours integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  memory_user_id uuid;
BEGIN
  -- Check if the memory exists and belongs to the current user
  SELECT user_id INTO memory_user_id
  FROM memories 
  WHERE id = memory_id;
  
  IF memory_user_id IS NULL THEN
    RAISE EXCEPTION 'Memory not found';
  END IF;
  
  IF memory_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Update the memory expiration
  IF expiration_hours IS NULL THEN
    -- Disable auto-delete
    UPDATE memories 
    SET expires_at = NULL, auto_delete_enabled = false
    WHERE id = memory_id;
  ELSE
    -- Set expiration time
    UPDATE memories 
    SET expires_at = now() + (expiration_hours || ' hours')::interval,
        auto_delete_enabled = true
    WHERE id = memory_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_memories() TO authenticated;
GRANT EXECUTE ON FUNCTION set_memory_expiration(uuid, integer) TO authenticated;

-- Note: In a production environment, you would set up a cron job or scheduled task
-- to call cleanup_expired_memories() periodically. For now, we'll handle this in the application.