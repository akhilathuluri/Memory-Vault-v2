-- Fix storage and file policies for Memory Vault
-- This migration ensures proper RLS policies for file operations

-- Storage bucket needs to be created manually via Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket: "memory-vault-files"
-- 3. Set as private (not public)
-- 4. Set file size limit: 10MB
-- 5. Set allowed MIME types: image/*, video/*

-- Ensure files table has proper RLS policies
-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can manage their own files" ON files;

-- Create separate policies for each operation
CREATE POLICY "Users can view their own files"
  ON files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- IMPORTANT: After running this migration, you MUST create the storage bucket manually:
--
-- In Supabase Dashboard -> Storage:
-- 1. Click "Create bucket"
-- 2. Name: "memory-vault-files"
-- 3. Public: false (private)
-- 4. File size limit: 10485760 (10MB)
-- 5. Allowed MIME types: image/*, video/*
--
-- Then create storage policies for the bucket:
-- 1. Upload Policy (objects table, INSERT operation):
--    Target roles: authenticated
--    Policy name: "Users can upload their own files"
--    USING expression: bucket_id = 'memory-vault-files' AND auth.uid()::text = (string_to_array(name, '/'))[1]
--
-- 2. Download Policy (objects table, SELECT operation):
--    Target roles: authenticated  
--    Policy name: "Users can download their own files"
--    USING expression: bucket_id = 'memory-vault-files' AND auth.uid()::text = (string_to_array(name, '/'))[1]
--
-- 3. Delete Policy (objects table, DELETE operation):
--    Target roles: authenticated
--    Policy name: "Users can delete their own files"  
--    USING expression: bucket_id = 'memory-vault-files' AND auth.uid()::text = (string_to_array(name, '/'))[1]
