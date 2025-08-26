/*
  # Add API key mode to user_settings

  1. New Column
    - `api_key_mode` - enum('user', 'webapp') DEFAULT 'user'
      - 'user': User provides their own API keys
      - 'webapp': Use webapp-provided API keys

  2. Update existing records to default to 'user' mode
*/

-- Add the new column
ALTER TABLE user_settings 
ADD COLUMN api_key_mode text CHECK (api_key_mode IN ('user', 'webapp')) DEFAULT 'user';

-- Update existing records to use 'user' mode
UPDATE user_settings 
SET api_key_mode = 'user' 
WHERE api_key_mode IS NULL;
