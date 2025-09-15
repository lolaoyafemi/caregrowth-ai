-- Fix critical security vulnerability: Restrict prompt access to user-owned prompts only

-- First, let's fix the prompts_modified table policies
-- Drop the overly permissive policy that allows all authenticated users to view all prompts
DROP POLICY IF EXISTS "All authenticated users can view prompts" ON public.prompts_modified;

-- Create secure policy that only allows users to view their own prompts OR super admins to view all
CREATE POLICY "Users can view their own prompts or super admins view all" 
ON public.prompts_modified 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Also fix the main prompts table which has the same vulnerability
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "All authenticated users can view prompts" ON public.prompts;

-- Create secure policy for prompts table
CREATE POLICY "Users can view their own prompts or super admins view all" 
ON public.prompts 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Add policy to allow users to create their own prompts in prompts_modified table
CREATE POLICY "Users can create their own prompts" 
ON public.prompts_modified 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to update their own prompts in prompts_modified table
CREATE POLICY "Users can update their own prompts" 
ON public.prompts_modified 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Add policy to allow users to delete their own prompts in prompts_modified table
CREATE POLICY "Users can delete their own prompts" 
ON public.prompts_modified 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Log this security fix
INSERT INTO public.security_events (event_type, event_data)
VALUES (
  'security_policy_updated',
  jsonb_build_object(
    'tables', ARRAY['prompts', 'prompts_modified'],
    'action', 'restricted_prompt_access',
    'description', 'Fixed critical vulnerability allowing competitors to access proprietary prompt templates'
  )
);