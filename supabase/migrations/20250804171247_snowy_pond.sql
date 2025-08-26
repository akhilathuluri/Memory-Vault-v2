/*
  # Fix user_settings RLS policies

  1. Security Updates
    - Drop existing policies that may be incorrectly configured
    - Create proper RLS policies for user_settings table
    - Ensure users can only access their own settings
    - Allow authenticated users to insert their own settings

  2. Policy Details
    - SELECT: Users can read their own settings
    - INSERT: Users can create their own settings
    - UPDATE: Users can update their own settings
    - DELETE: Users can delete their own settings
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own settings" ON user_settings;

-- Create comprehensive RLS policies for user_settings
CREATE POLICY "Users can read own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);