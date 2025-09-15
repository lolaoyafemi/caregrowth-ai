-- Fix critical security vulnerability in credit_sales_log table RLS policies
-- Issue 1: Overly permissive INSERT policy using 'true' condition
-- Issue 2: Using users table in policy could cause infinite recursion
-- Issue 3: No security monitoring for sensitive financial data access

-- Drop existing problematic policies
DROP POLICY IF EXISTS "edge_functions_can_insert_sales" ON public.credit_sales_log;
DROP POLICY IF EXISTS "super_admin_can_view_all_sales" ON public.credit_sales_log;

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

-- Prevent any UPDATE/DELETE operations on sales records (data integrity)
-- No policies needed as these operations should never be allowed

-- Add security logging function for sales data access
CREATE OR REPLACE FUNCTION public.log_sales_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log sales data access for security monitoring (without exposing sensitive data)
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'sales_data_access',
    jsonb_build_object(
      'sale_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now(),
      'role', auth.role(),
      'note', 'Financial sales data accessed - sensitive details not logged for security'
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to log sales data access for security monitoring
DROP TRIGGER IF EXISTS log_sales_data_access_trigger ON public.credit_sales_log;
CREATE TRIGGER log_sales_data_access_trigger
  AFTER INSERT OR SELECT ON public.credit_sales_log
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sales_data_access();

-- Create a secure function for administrative reporting (if needed)
CREATE OR REPLACE FUNCTION public.get_sales_summary()
RETURNS TABLE (
  total_sales bigint,
  total_revenue numeric,
  sales_this_month bigint,
  revenue_this_month numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow super admins to call this function
  IF NOT public.is_current_user_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Only super administrators can view sales summaries';
  END IF;
  
  -- Log the access
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'sales_summary_accessed',
    jsonb_build_object(
      'timestamp', now(),
      'note', 'Sales summary data accessed by super admin'
    )
  );
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_sales,
    COALESCE(SUM(amount_paid), 0) as total_revenue,
    COUNT(CASE WHEN timestamp >= date_trunc('month', now()) THEN 1 END)::bigint as sales_this_month,
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('month', now()) THEN amount_paid ELSE 0 END), 0) as revenue_this_month
  FROM public.credit_sales_log;
END;
$$;