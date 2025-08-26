# Apply Database Migration

Since Supabase isn't running locally, you'll need to apply the migration manually.

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard
2. Navigate to "SQL Editor"
3. Run this SQL:

```sql
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
```

## Option 2: Local Supabase CLI

If you have Docker running and Supabase CLI installed:

```bash
npx supabase start
npx supabase db reset
```

## Verification

After applying the migration, you can verify it worked by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'answer_model';
```

This should return the new `answer_model` column of type `text`.
