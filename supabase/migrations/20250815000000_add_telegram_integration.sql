-- Create telegram_users table for linking Telegram accounts to app users
CREATE TABLE IF NOT EXISTS telegram_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_user_id TEXT NOT NULL UNIQUE,
    telegram_username TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_user_id ON telegram_users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_active ON telegram_users(is_active) WHERE is_active = true;

-- Create telegram_linking_codes table for secure account linking
CREATE TABLE IF NOT EXISTS telegram_linking_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linking_code TEXT NOT NULL UNIQUE,
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for linking codes
CREATE INDEX IF NOT EXISTS idx_telegram_linking_codes_code ON telegram_linking_codes(linking_code);
CREATE INDEX IF NOT EXISTS idx_telegram_linking_codes_user_id ON telegram_linking_codes(user_id);

-- Create telegram_messages table for logging (optional, for debugging)
CREATE TABLE IF NOT EXISTS telegram_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_user_id TEXT NOT NULL,
    message_id BIGINT NOT NULL,
    message_type TEXT NOT NULL, -- 'text', 'photo', 'document', 'voice', etc.
    content TEXT,
    file_id TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    file_record_id UUID REFERENCES files(id) ON DELETE SET NULL
);

-- Create indexes for message logging
CREATE INDEX IF NOT EXISTS idx_telegram_messages_telegram_user_id ON telegram_messages(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_processed_at ON telegram_messages(processed_at);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_success ON telegram_messages(success);

-- Enable Row Level Security (RLS)
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_linking_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telegram_users
CREATE POLICY "Users can view their own telegram connections" ON telegram_users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram connections" ON telegram_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram connections" ON telegram_users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own telegram connections" ON telegram_users
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for telegram_linking_codes
CREATE POLICY "Users can view their own linking codes" ON telegram_linking_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linking codes" ON telegram_linking_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linking codes" ON telegram_linking_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for telegram_messages (read-only for users)
CREATE POLICY "Users can view their telegram messages" ON telegram_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.telegram_user_id = telegram_messages.telegram_user_id 
            AND tu.user_id = auth.uid()
        )
    );

-- Function to generate linking codes
CREATE OR REPLACE FUNCTION generate_telegram_linking_code(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    code TEXT;
BEGIN
    -- Generate a random 6-character code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Invalidate any existing unused codes for this user
    UPDATE telegram_linking_codes 
    SET is_used = true, used_at = now()
    WHERE user_id = user_uuid AND is_used = false;
    
    -- Insert new linking code
    INSERT INTO telegram_linking_codes (user_id, linking_code)
    VALUES (user_uuid, code);
    
    RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify and use linking code
CREATE OR REPLACE FUNCTION verify_telegram_linking_code(code TEXT, telegram_uid TEXT, telegram_uname TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
    code_record RECORD;
BEGIN
    -- Find valid linking code
    SELECT * INTO code_record
    FROM telegram_linking_codes
    WHERE linking_code = code
    AND is_used = false;
    
    IF NOT FOUND THEN
        RETURN NULL; -- Invalid code
    END IF;
    
    user_uuid := code_record.user_id;
    
    -- Mark code as used
    UPDATE telegram_linking_codes
    SET is_used = true, used_at = now()
    WHERE id = code_record.id;
    
    -- Link or update telegram user
    INSERT INTO telegram_users (telegram_user_id, telegram_username, user_id, is_active)
    VALUES (telegram_uid, telegram_uname, user_uuid, true)
    ON CONFLICT (telegram_user_id) 
    DO UPDATE SET 
        telegram_username = EXCLUDED.telegram_username,
        user_id = EXCLUDED.user_id,
        is_active = true,
        updated_at = now();
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find user by telegram ID
CREATE OR REPLACE FUNCTION find_user_by_telegram_id(telegram_uid TEXT)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT user_id INTO user_uuid
    FROM telegram_users
    WHERE telegram_user_id = telegram_uid
    AND is_active = true;
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log telegram messages
CREATE OR REPLACE FUNCTION log_telegram_message(
    telegram_uid TEXT,
    msg_id BIGINT,
    msg_type TEXT,
    content_text TEXT DEFAULT NULL,
    file_id_text TEXT DEFAULT NULL,
    success_flag BOOLEAN DEFAULT true,
    error_msg TEXT DEFAULT NULL,
    memory_uuid UUID DEFAULT NULL,
    file_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO telegram_messages (
        telegram_user_id,
        message_id,
        message_type,
        content,
        file_id,
        success,
        error_message,
        memory_id,
        file_record_id
    ) VALUES (
        telegram_uid,
        msg_id,
        msg_type,
        content_text,
        file_id_text,
        success_flag,
        error_msg,
        memory_uuid,
        file_uuid
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_telegram_users_updated_at
    BEFORE UPDATE ON telegram_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON telegram_users TO authenticated;
GRANT ALL ON telegram_linking_codes TO authenticated;
GRANT SELECT ON telegram_messages TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_telegram_linking_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_telegram_linking_code(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_user_by_telegram_id(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_telegram_message(TEXT, BIGINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) TO authenticated, anon;

-- Additional RLS policies for bot access
CREATE POLICY "Allow anon to select telegram users for bot" ON telegram_users
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Allow anon to insert telegram users via bot" ON telegram_users
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon to update telegram users via bot" ON telegram_users
    FOR UPDATE TO anon
    USING (true);

CREATE POLICY "Allow anon to select linking codes for verification" ON telegram_linking_codes
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Allow anon to update linking codes for verification" ON telegram_linking_codes
    FOR UPDATE TO anon
    USING (true);