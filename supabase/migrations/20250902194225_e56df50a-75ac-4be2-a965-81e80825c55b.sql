-- Update default role for new users to admin
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'admin';
ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'admin';