-- Fix critical security vulnerability: Explicitly deny anonymous access to OpenAI keys
-- Add comprehensive access controls to protect API keys

-- Add explicit policy to deny anonymous access to OpenAI keys
CREATE POLICY "Deny anonymous access to OpenAI keys" 
ON public.openai_keys 
FOR ALL 
TO anon 
USING (false);

-- Add explicit policy to deny authenticated non-super-admin users
CREATE POLICY "Deny non-super-admin access to OpenAI keys" 
ON public.openai_keys 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Ensure the existing super admin policy is the most permissive
-- (The existing policy should remain as the primary access control)