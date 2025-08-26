-- COMPREHENSIVE FIX FOR FILES TABLE RLS POLICIES
-- COPY AND PASTE THIS ENTIRE SCRIPT INTO YOUR SUPABASE SQL EDITOR

-- Step 1: Check if RLS is enabled and current policies
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'files';

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'files';

-- Step 2: Completely reset the files table policies
ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for files table
DROP POLICY IF EXISTS "Users can manage their own files" ON files;
DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
DROP POLICY IF EXISTS "Users can update their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Step 3: Re-enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new, working policies with proper syntax
CREATE POLICY "files_select_policy"
ON files
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "files_insert_policy"
ON files
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "files_update_policy"
ON files
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "files_delete_policy"
ON files
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'files'
ORDER BY policyname;

-- Step 6: Test the policies by checking if current user can access
SELECT 'Policy test successful - you can access files table' as result
WHERE EXISTS (
  SELECT 1 FROM files LIMIT 1
)
OR NOT EXISTS (
  SELECT 1 FROM files LIMIT 1
);
