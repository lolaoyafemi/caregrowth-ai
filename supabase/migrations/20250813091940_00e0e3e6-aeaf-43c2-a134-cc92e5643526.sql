-- Fix critical security vulnerability: Restrict users table access to own data only
-- Replace the overly permissive SELECT policy with a secure one

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- Create a secure policy that only allows users to see their own data
CREATE POLICY "Users can only view their own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Add a policy for super admins to view all users (needed for admin functionality)
CREATE POLICY "Super admins can view all users" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);