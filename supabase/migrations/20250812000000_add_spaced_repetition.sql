-- Create review_schedules table for spaced repetition
CREATE TABLE IF NOT EXISTS review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL,
  review_interval_days INTEGER NOT NULL DEFAULT 1,
  review_count INTEGER NOT NULL DEFAULT 0,
  difficulty_level INTEGER NOT NULL DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id, user_id)
);

-- Create review_sessions table to track review sessions
CREATE TABLE IF NOT EXISTS review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memories_reviewed TEXT[] DEFAULT '{}',
  session_duration_ms BIGINT DEFAULT 0,
  correct_recalls INTEGER DEFAULT 0,
  total_recalls INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_schedules_user_id ON review_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_next_review_date ON review_schedules(next_review_date);
CREATE INDEX IF NOT EXISTS idx_review_schedules_memory_id ON review_schedules(memory_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_user_id ON review_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_completed_at ON review_sessions(completed_at);

-- Enable RLS on the new tables
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for review_schedules
CREATE POLICY "Users can view their own review schedules" ON review_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review schedules" ON review_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review schedules" ON review_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review schedules" ON review_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for review_sessions
CREATE POLICY "Users can view their own review sessions" ON review_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review sessions" ON review_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review sessions" ON review_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review sessions" ON review_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at column for review_schedules
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_review_schedules_updated_at ON review_schedules;
CREATE TRIGGER update_review_schedules_updated_at
  BEFORE UPDATE ON review_schedules
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
