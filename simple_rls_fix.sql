-- Simple RLS fix for memory_locations table
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memory locations" ON memory_locations;
DROP POLICY IF EXISTS "Users can insert their own memory locations" ON memory_locations;
DROP POLICY IF EXISTS "Users can update their own memory locations" ON memory_locations;
DROP POLICY IF EXISTS "Users can delete their own memory locations" ON memory_locations;

-- Create simple, working policies
CREATE POLICY "memory_locations_select"
ON memory_locations FOR SELECT
USING (
    memory_id IN (
        SELECT id FROM memories WHERE user_id = auth.uid()
    )
);

CREATE POLICY "memory_locations_insert"
ON memory_locations FOR INSERT
WITH CHECK (
    memory_id IN (
        SELECT id FROM memories WHERE user_id = auth.uid()
    )
);

CREATE POLICY "memory_locations_update"
ON memory_locations FOR UPDATE
USING (
    memory_id IN (
        SELECT id FROM memories WHERE user_id = auth.uid()
    )
);

CREATE POLICY "memory_locations_delete"
ON memory_locations FOR DELETE
USING (
    memory_id IN (
        SELECT id FROM memories WHERE user_id = auth.uid()
    )
);