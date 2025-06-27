
-- Add status column to user_profiles table to support user suspension/activation
ALTER TABLE public.user_profiles 
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending'));

-- Add role column to user_profiles table to support role-based access
ALTER TABLE public.user_profiles 
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'agency_admin', 'admin', 'user', 'collaborator', 'content_writer'));

-- Add last_sign_in_at column to user_profiles table for tracking user activity
ALTER TABLE public.user_profiles 
ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Create an index on status for better query performance
CREATE INDEX idx_user_profiles_status ON public.user_profiles(status);

-- Create an index on role for better query performance
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- Update existing records to have proper default values
UPDATE public.user_profiles 
SET status = 'active' 
WHERE status IS NULL;

UPDATE public.user_profiles 
SET role = 'user' 
WHERE role IS NULL;
