-- Clean up orphaned user_profiles that don't have corresponding users in auth
DELETE FROM user_profiles 
WHERE user_id NOT IN (SELECT id FROM users);

-- Ensure all users have corresponding profiles
INSERT INTO user_profiles (user_id, email, created_at, updated_at, role, credits, status)
SELECT 
  u.id,
  u.email,
  COALESCE(u.created_at, now()),
  now(),
  COALESCE(u.role, 'user'),
  COALESCE(u.credits, 0),
  'active'
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- Create a function to automatically create user_profiles when users are created
CREATE OR REPLACE FUNCTION public.sync_user_profile_on_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert corresponding profile when user is created
  INSERT INTO public.user_profiles (user_id, email, created_at, updated_at, role, credits, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.created_at, now()),
    now(),
    COALESCE(NEW.role, 'user'),
    COALESCE(NEW.credits, 0),
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    credits = EXCLUDED.credits,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync profiles when users are created
DROP TRIGGER IF EXISTS sync_user_profile_trigger ON users;
CREATE TRIGGER sync_user_profile_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile_on_insert();

-- Update the existing sync function to be bidirectional
CREATE OR REPLACE FUNCTION public.sync_user_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When user_profiles is updated, sync to users table
  IF TG_TABLE_NAME = 'user_profiles' THEN
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
      UPDATE public.users 
      SET 
        credits = COALESCE(NEW.credits, 0),
        role = COALESCE(NEW.role, 'user'),
        email = COALESCE(NEW.email, users.email)
      WHERE id = NEW.user_id;
      
      -- If user doesn't exist, create it
      IF NOT FOUND THEN
        INSERT INTO public.users (id, email, role, credits, created_at)
        VALUES (
          NEW.user_id,
          NEW.email,
          COALESCE(NEW.role, 'user'),
          COALESCE(NEW.credits, 0),
          COALESCE(NEW.created_at, now())
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  -- When users table is updated, sync to user_profiles
  IF TG_TABLE_NAME = 'users' THEN
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
      UPDATE public.user_profiles 
      SET 
        credits = COALESCE(NEW.credits, 0),
        role = COALESCE(NEW.role, 'user'),
        email = COALESCE(NEW.email, user_profiles.email),
        updated_at = now()
      WHERE user_id = NEW.id;
      
      -- If profile doesn't exist, create it
      IF NOT FOUND THEN
        INSERT INTO public.user_profiles (user_id, email, role, credits, created_at, updated_at, status)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.role, 'user'),
          COALESCE(NEW.credits, 0),
          COALESCE(NEW.created_at, now()),
          now(),
          'active'
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for bidirectional sync
DROP TRIGGER IF EXISTS sync_user_data_trigger ON users;
CREATE TRIGGER sync_user_data_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_data();

DROP TRIGGER IF EXISTS sync_profile_data_trigger ON user_profiles;  
CREATE TRIGGER sync_profile_data_trigger
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_data();

-- Add unique constraint to prevent duplicate profiles
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);