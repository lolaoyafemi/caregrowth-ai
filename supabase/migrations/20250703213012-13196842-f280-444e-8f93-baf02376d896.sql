
-- Update credits in users table from user_profiles table
-- This will sync the credits from user_profiles (source of truth) to users table
UPDATE public.users 
SET credits = COALESCE(up.credits, 0)
FROM public.user_profiles up 
WHERE users.id = up.user_id;

-- For users that exist in users table but not in user_profiles, set credits to 0
UPDATE public.users 
SET credits = 0 
WHERE id NOT IN (SELECT user_id FROM public.user_profiles WHERE user_id IS NOT NULL);

-- Optional: Add a trigger to keep them in sync going forward
CREATE OR REPLACE FUNCTION sync_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- When user_profiles credits are updated, update the users table as well
  IF TG_OP = 'UPDATE' AND OLD.credits IS DISTINCT FROM NEW.credits THEN
    UPDATE public.users 
    SET credits = COALESCE(NEW.credits, 0)
    WHERE id = NEW.user_id;
  END IF;
  
  -- When a new user_profile is created, update the users table
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users 
    SET credits = COALESCE(NEW.credits, 0)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync credits when user_profiles is updated
DROP TRIGGER IF EXISTS sync_credits_trigger ON public.user_profiles;
CREATE TRIGGER sync_credits_trigger
  AFTER INSERT OR UPDATE OF credits ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_credits();
