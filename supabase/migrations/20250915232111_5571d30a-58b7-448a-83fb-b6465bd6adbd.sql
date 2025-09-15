-- Fix critical security vulnerability in credit_sales_log table RLS policies
-- Issue 1: Overly permissive INSERT policy using 'true' condition  
-- Issue 2: Using users table in policy could cause infinite recursion
-- Issue 3: No security monitoring for sensitive financial data access

-- First, get a clean slate by dropping ALL existing policies on credit_sales_log
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'credit_sales_log' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.credit_sales_log', policy_record.policyname);
    END LOOP;
END $$;

-- Create secure policy for service role operations (Stripe webhooks and edge functions only)
CREATE POLICY "Service role can insert sales records"
ON public.credit_sales_log
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create secure policy for super admin viewing using our safe function
CREATE POLICY "Super admins can view all sales records"
ON public.credit_sales_log
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_current_user_super_admin()
);

-- Add security logging function for sales data modifications
CREATE OR REPLACE FUNCTION public.log_sales_data_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log sales data modifications for security monitoring (without exposing sensitive data)
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'sales_data_modification',
    jsonb_build_object(
      'sale_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now(),
      'role', auth.role(),
      'note', 'Financial sales data modified - sensitive details not logged for security'
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to log sales data modifications
DROP TRIGGER IF EXISTS log_sales_data_modification_trigger ON public.credit_sales_log;
CREATE TRIGGER log_sales_data_modification_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_sales_log
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sales_data_modification();