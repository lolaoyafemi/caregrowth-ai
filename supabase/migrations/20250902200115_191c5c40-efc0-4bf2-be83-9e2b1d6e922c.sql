-- Update all existing users with content_writer role to admin role
UPDATE public.users 
SET role = 'admin' 
WHERE role = 'content_writer';

-- Update all existing user profiles with content_writer role to admin role  
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE role = 'content_writer';