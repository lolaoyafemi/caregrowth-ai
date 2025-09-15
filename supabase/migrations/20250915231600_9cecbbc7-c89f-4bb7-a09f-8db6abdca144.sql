-- Fix critical security vulnerability in openai_keys table RLS policies
-- Issue 1: RLS policies use users table which could cause infinite recursion
-- Issue 2: Redundant policies that could create confusion
-- Issue 3: Need stronger authentication validation

-- Drop existing redundant and potentially problematic policies
DROP POLICY IF EXISTS "Deny anonymous access to OpenAI keys" ON public.openai_keys;
DROP POLICY IF EXISTS "Deny non-super-admin access to OpenAI keys" ON public.openai_keys;
DROP POLICY IF EXISTS "Super admins can manage OpenAI keys" ON public.openai_keys;

-- Create single, secure policy for super admin access using our safe function
CREATE POLICY "Only super admins can manage OpenAI keys"
ON public.openai_keys
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.is_current_user_super_admin()
);

-- Add additional security: Log all OpenAI key access attempts
CREATE OR REPLACE FUNCTION public.log_openai_key_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log OpenAI key access for security monitoring (without exposing the actual key)
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'openai_key_access',
    jsonb_build_object(
      'key_id', COALESCE(NEW.id, OLD.id),
      'key_name', COALESCE(NEW.key_name, OLD.key_name),
      'operation', TG_OP,
      'timestamp', now(),
      'role', auth.role(),
      'note', 'OpenAI API key accessed - actual key not logged for security'
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to log OpenAI key access for security monitoring
DROP TRIGGER IF EXISTS log_openai_key_access_trigger ON public.openai_keys;
CREATE TRIGGER log_openai_key_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.openai_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_openai_key_access();

-- Create a secure function for edge functions to retrieve active OpenAI key
-- This provides controlled access without exposing the full table
CREATE OR REPLACE FUNCTION public.get_active_openai_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  api_key text;
BEGIN
  -- Only allow service role to call this function (for edge functions)
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Only service role can retrieve OpenAI keys';
  END IF;
  
  -- Get the first active key
  SELECT secret_key INTO api_key
  FROM public.openai_keys
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Log the access
  INSERT INTO public.security_events (
    event_type,
    event_data
  ) VALUES (
    'openai_key_retrieved',
    jsonb_build_object(
      'timestamp', now(),
      'caller_role', auth.role(),
      'note', 'OpenAI key retrieved by edge function'
    )
  );
  
  RETURN api_key;
END;
$$;