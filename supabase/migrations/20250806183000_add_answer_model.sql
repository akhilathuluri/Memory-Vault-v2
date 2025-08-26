-- Add answer_model column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN answer_model TEXT;

-- Set default values based on existing ai_provider
UPDATE user_settings 
SET answer_model = CASE 
  WHEN ai_provider = 'github' THEN 'gpt-4o-mini'
  WHEN ai_provider = 'openrouter' THEN 'openai/gpt-3.5-turbo'
  ELSE 'gpt-4o-mini'
END
WHERE answer_model IS NULL;
