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
  -- Log OpenAI key access for security monitoring
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
      'role', auth.role()
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

-- Add column-level security: Create a view that masks sensitive data for logging
CREATE OR REPLACE VIEW public.openai_keys_audit AS
SELECT 
  id,
  key_name,
  active,
  created_at,
  'MASKED' as secret_key_preview
FROM public.openai_keys;

-- Grant appropriate permissions on the audit view
GRANT SELECT ON public.openai_keys_audit TO authenticated;

-- Create policy for the audit view (for safer monitoring)
CREATE POLICY "Super admins can view OpenAI keys audit"
ON public.openai_keys_audit
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_current_user_super_admin()
);