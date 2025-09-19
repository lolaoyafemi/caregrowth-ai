-- Backfill full_name from users table where it exists, fallback to email prefix
UPDATE user_profiles 
SET full_name = COALESCE(
  (SELECT name FROM users WHERE users.id = user_profiles.user_id),
  SPLIT_PART(user_profiles.email, '@', 1)
)
WHERE full_name IS NULL;