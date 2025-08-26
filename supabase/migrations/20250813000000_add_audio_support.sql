-- Add support for audio files in the files table
-- This migration updates the file_type column to include 'audio' as a valid type

-- First, drop the existing check constraint if it exists
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_file_type_check;

-- Add a new check constraint that includes 'audio'
ALTER TABLE files ADD CONSTRAINT files_file_type_check 
  CHECK (file_type IN ('image', 'video', 'audio'));

-- Add a comment to document the supported file types
COMMENT ON COLUMN files.file_type IS 'Supported file types: image, video, audio';

-- Create an index on file_type for better query performance
CREATE INDEX IF NOT EXISTS files_file_type_idx ON files(file_type);

-- Update the search function to handle audio files if needed
-- The existing search_files function should already work with audio files
-- since it doesn't filter by file_type, but let's ensure it's documented

COMMENT ON FUNCTION search_files(vector, float, int) IS 'Search files by embedding similarity. Supports image, video, and audio files.';

-- Update storage bucket policies to allow audio file uploads
-- This ensures audio MIME types are accepted
DO $$
BEGIN
  -- Check if the bucket exists and update allowed MIME types
  -- Note: This may need to be run manually in Supabase dashboard
  -- as bucket configurations are typically managed through the UI
  
  -- For reference, supported audio MIME types should include:
  -- - audio/mpeg (MP3)
  -- - audio/wav (WAV)
  -- - audio/mp4 (M4A)
  -- - audio/webm (WebM audio)
  -- - audio/ogg (OGG)
  
  RAISE NOTICE 'Audio file support added. Ensure storage bucket "memory-vault-files" allows audio MIME types in Supabase dashboard.';
END $$;
