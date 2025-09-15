-- Fix critical security vulnerability in users table RLS policies
-- Issue 1: Remove infinite recursion by not using is_super_admin() function that queries users table
-- Issue 2: Strengthen authentication checks and ensure proper access control

-- First, create a secure function to check super admin status using user_profiles table
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can only view their own data" ON public.users;

-- Create new secure SELECT policies with proper authentication validation
CREATE POLICY "Users can view their own data only"
ON public.users
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

CREATE POLICY "Super admins can view all users"
ON public.users  
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_current_user_super_admin()
);

-- Strengthen UPDATE policy to ensure user can only update their own record
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Strengthen INSERT policy to ensure only authenticated users can insert
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

CREATE POLICY "Authenticated users can create user records"
ON public.users
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = id
);