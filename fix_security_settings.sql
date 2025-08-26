-- Fix security settings table and RLS policies
-- Run this in your Supabase SQL Editor

-- Drop existing table if it has issues
DROP TABLE IF EXISTS security_settings CASCADE;

-- Create security settings table for vault locking
CREATE TABLE security_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vault_lock_enabled BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    pin_enabled BOOLEAN DEFAULT FALSE,
    pin_hash TEXT,
    lock_timeout INTEGER DEFAULT 15, -- minutes
    auto_lock_on_minimize BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own security settings" ON security_settings;
DROP POLICY IF EXISTS "Users can insert their own security settings" ON security_settings;
DROP POLICY IF EXISTS "Users can update their own security settings" ON security_settings;
DROP POLICY IF EXISTS "Users can delete their own security settings" ON security_settings;

-- Create simple, working RLS policies
CREATE POLICY "security_settings_select"
ON security_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "security_settings_insert"
ON security_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "security_settings_update"
ON security_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "security_settings_delete"
ON security_settings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_vault_lock_enabled ON security_settings(vault_lock_enabled);

-- Add updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_security_settings_updated_at ON security_settings;
CREATE TRIGGER update_security_settings_updated_at
    BEFORE UPDATE ON security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test the table by selecting from it (should return empty result, not error)
SELECT COUNT(*) as table_ready FROM security_settings;