-- Update the handle_new_user function to set new users as 'admin' by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles(user_id, email, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    'admin',  -- Set all new users to admin role by default
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- Update the sync_user_profile_on_insert function to also default to 'admin'
CREATE OR REPLACE FUNCTION public.sync_user_profile_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, created_at, updated_at, role, credits, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.created_at, now()),
    now(),
    COALESCE(NEW.role, 'admin'),  -- Changed from 'user' to 'admin'
    COALESCE(NEW.credits, 0),
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN user_profiles.role = 'user' THEN 'admin'  -- Upgrade existing 'user' role to 'admin'
      ELSE EXCLUDED.role 
    END,
    credits = EXCLUDED.credits,
    updated_at = now();
    
  RETURN NEW;
END;
$$;