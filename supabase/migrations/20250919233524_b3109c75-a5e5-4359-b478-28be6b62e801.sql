-- Update all existing users with 'user' role to 'admin' role
UPDATE public.user_profiles 
SET role = 'admin', updated_at = now()
WHERE role = 'user';

-- Also update the users table to keep it in sync
UPDATE public.users 
SET role = 'admin'
WHERE role = 'user';