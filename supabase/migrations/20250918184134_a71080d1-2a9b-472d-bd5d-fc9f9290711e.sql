-- Allow super admins to view all profiles  
CREATE POLICY "Super admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (public.is_current_user_super_admin());