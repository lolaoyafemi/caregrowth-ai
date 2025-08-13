-- Fix critical security vulnerability: Restrict post_history table access to own data only
-- Replace the overly permissive SELECT policy with a secure one

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.post_history;

-- Create a secure policy that only allows users to see their own post history
CREATE POLICY "Users can only view their own post history" 
ON public.post_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add a policy for super admins to view all post history (needed for admin functionality)
CREATE POLICY "Super admins can view all post history" 
ON public.post_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);