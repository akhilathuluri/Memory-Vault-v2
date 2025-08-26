-- Storage Bucket Setup for Memory Vault
-- Run this in the Supabase SQL Editor if the storage bucket doesn't exist

-- Create the storage bucket for files (run this if automatic creation fails)
-- Note: This needs to be done via the Supabase Dashboard -> Storage
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "Create a new bucket"
-- 3. Bucket name: memory-vault-files
-- 4. Make it private (uncheck "Public bucket")
-- 5. Set file size limit to 10MB
-- 6. Allowed MIME types: image/*, video/*

-- Storage policies for the bucket (run this in SQL Editor after creating bucket)
-- Enable RLS on the storage.objects table for our bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'memory-vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'memory-vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'memory-vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- If you want to allow users to update their files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'memory-vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);
