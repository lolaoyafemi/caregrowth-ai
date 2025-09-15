-- Fix authentication issue: Sync user roles between users and user_profiles tables
-- Issue: Role mismatch between tables is breaking the authentication flow after login

-- First, let's check and fix the role inconsistencies
-- Update user_profiles to match users table roles
UPDATE public.user_profiles 
SET role = u.role
FROM public.users u
WHERE user_profiles.user_id = u.id 
AND user_profiles.role != u.role;

-- Create missing user_profiles records for users who don't have them
INSERT INTO public.user_profiles (user_id, email, role, created_at, updated_at)
SELECT u.id, u.email, u.role, now(), now()
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- Create a more robust function that handles missing user_profiles gracefully
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.user_profiles WHERE user_id = auth.uid()),
    (SELECT role = 'super_admin' FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

-- Also create a trigger to keep the roles in sync going forward
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a role is updated in users table, update user_profiles
  IF TG_TABLE_NAME = 'users' AND TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    UPDATE public.user_profiles 
    SET role = NEW.role, updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  -- When a role is updated in user_profiles table, update users
  IF TG_TABLE_NAME = 'user_profiles' AND TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    UPDATE public.users 
    SET role = NEW.role
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to keep roles in sync
DROP TRIGGER IF EXISTS sync_user_roles_from_users ON public.users;
CREATE TRIGGER sync_user_roles_from_users
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles();

DROP TRIGGER IF EXISTS sync_user_roles_from_profiles ON public.user_profiles;
CREATE TRIGGER sync_user_roles_from_profiles
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles();