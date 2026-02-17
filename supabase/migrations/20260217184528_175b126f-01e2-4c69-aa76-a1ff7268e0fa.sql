
-- Add preferred_time and timezone columns to user_profiles for smart scheduling
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS preferred_post_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS reschedule_count integer DEFAULT 0;
