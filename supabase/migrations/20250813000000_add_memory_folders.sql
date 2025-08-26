-- Create memory_folders table
CREATE TABLE IF NOT EXISTS memory_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  icon VARCHAR(50) DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT memory_folders_name_check CHECK (length(name) >= 1 AND length(name) <= 100),
  CONSTRAINT memory_folders_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT memory_folders_user_name_unique UNIQUE (user_id, name)
);

-- Add folder_id column to memories table
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES memory_folders(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memory_folders_user_id ON memory_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_folders_created_at ON memory_folders(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_folder_id ON memories(folder_id);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_memory_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_memory_folders_updated_at
  BEFORE UPDATE ON memory_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_folders_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE memory_folders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own folders
CREATE POLICY "Users can view their own folders" ON memory_folders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own folders
CREATE POLICY "Users can create their own folders" ON memory_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY "Users can update their own folders" ON memory_folders
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own folders
CREATE POLICY "Users can delete their own folders" ON memory_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_folders TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
