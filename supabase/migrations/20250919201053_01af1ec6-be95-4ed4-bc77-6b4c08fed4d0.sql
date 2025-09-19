-- Add full_name column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Backfill existing rows where full_name is NULL to use email prefix as name
UPDATE user_profiles 
SET full_name = SPLIT_PART(email, '@', 1) 
WHERE full_name IS NULL AND email IS NOT NULL;