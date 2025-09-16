-- Create user records for orphaned user_profiles with unique emails
INSERT INTO users (id, email, role, credits, created_at)
SELECT 
  up.user_id,
  COALESCE(up.email, 'user_' || up.user_id::text || '@restored.local'),
  COALESCE(up.role, 'user'),
  COALESCE(up.credits, 0),
  COALESCE(up.created_at, now())
FROM user_profiles up
LEFT JOIN users u ON up.user_id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

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
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create sync function for new user insertions
CREATE OR REPLACE FUNCTION public.sync_user_profile_on_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Create trigger for user insertion sync
DROP TRIGGER IF EXISTS sync_user_profile_trigger ON users;
CREATE TRIGGER sync_user_profile_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile_on_insert();

-- Create bidirectional sync function for updates
CREATE OR REPLACE FUNCTION public.sync_user_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When user_profiles is updated, sync to users table
  IF TG_TABLE_NAME = 'user_profiles' THEN
    IF TG_OP = 'UPDATE' AND (OLD.credits IS DISTINCT FROM NEW.credits OR OLD.role IS DISTINCT FROM NEW.role) THEN
      UPDATE public.users 
      SET 
        credits = COALESCE(NEW.credits, 0),
        role = COALESCE(NEW.role, 'user')
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- When users table is updated, sync to user_profiles
  IF TG_TABLE_NAME = 'users' THEN
    IF TG_OP = 'UPDATE' AND (OLD.credits IS DISTINCT FROM NEW.credits OR OLD.role IS DISTINCT FROM NEW.role) THEN
      UPDATE public.user_profiles 
      SET 
        credits = COALESCE(NEW.credits, 0),
        role = COALESCE(NEW.role, 'user'),
        updated_at = now()
      WHERE user_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create update sync triggers
DROP TRIGGER IF EXISTS sync_user_data_trigger ON users;
CREATE TRIGGER sync_user_data_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_data();

DROP TRIGGER IF EXISTS sync_profile_data_trigger ON user_profiles;  
CREATE TRIGGER sync_profile_data_trigger
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_data();