-- Fix RLS policies for memory_locations table
-- Run this in your Supabase SQL Editor

-- First, let's check if RLS is enabled and what policies exist
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'memory_locations';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'memory_locations';

-- Drop existing policies and recreate them with correct syntax
DROP POLICY IF EXISTS "Users can view their own memory locations" ON memory_locations;
DROP POLICY IF EXISTS "Users can insert their own memory locations" ON memory_locations;
DROP POLICY IF EXISTS "Users can update their own memory locations" ON memory_locations;
DROP POLICY IF EXISTS "Users can delete their own memory locations" ON memory_locations;

-- Create new, working policies
CREATE POLICY "memory_locations_select_policy"
ON memory_locations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM memories 
        WHERE memories.id = memory_locations.memory_id 
        AND memories.user_id = auth.uid()
    )
);

CREATE POLICY "memory_locations_insert_policy"
ON memory_locations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM memories 
        WHERE memories.id = memory_locations.memory_id 
        AND memories.user_id = auth.uid()
    )
);

CREATE POLICY "memory_locations_update_policy"
ON memory_locations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM memories 
        WHERE memories.id = memory_locations.memory_id 
        AND memories.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM memories 
        WHERE memories.id = memory_locations.memory_id 
        AND memories.user_id = auth.uid()
    )
);

CREATE POLICY "memory_locations_delete_policy"
ON memory_locations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM memories 
        WHERE memories.id = memory_locations.memory_id 
        AND memories.user_id = auth.uid()
    )
);

-- Alternative: Create a function to get memory location (bypasses RLS)
CREATE OR REPLACE FUNCTION get_memory_location(memory_uuid UUID)
RETURNS TABLE (
    id UUID,
    memory_id UUID,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(8, 2),
    address TEXT,
    city TEXT,
    country TEXT,
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the user owns the memory
    IF NOT EXISTS (
        SELECT 1 FROM memories 
        WHERE memories.id = memory_uuid 
        AND memories.user_id = auth.uid()
    ) THEN
        RETURN;
    END IF;
    
    -- Return the location data
    RETURN QUERY
    SELECT 
        ml.id,
        ml.memory_id,
        ml.latitude,
        ml.longitude,
        ml.accuracy,
        ml.address,
        ml.city,
        ml.country,
        ml.recorded_at,
        ml.created_at,
        ml.updated_at
    FROM memory_locations ml
    WHERE ml.memory_id = memory_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_memory_location TO authenticated;