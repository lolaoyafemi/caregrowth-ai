-- Fix infinite recursion in RLS policies

-- Create a security definer function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "super_admin_can_view_all_usage" ON public.credit_usage_log;

-- Recreate the policies using the security definer function
CREATE POLICY "Super admins can view all users" 
ON public.users 
FOR SELECT 
USING (public.is_super_admin() OR auth.uid() = id);

CREATE POLICY "super_admin_can_view_all_usage" 
ON public.credit_usage_log 
FOR SELECT 
USING (public.is_super_admin() OR auth.uid() = user_id);