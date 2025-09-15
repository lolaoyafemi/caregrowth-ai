-- Fix critical security vulnerability in payments table RLS policies
-- Issue: Overly permissive system policies could allow unauthorized access to payment data
-- Solution: Restrict system access to service role only and strengthen authentication checks

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Create secure policy for service role operations (used by Stripe webhooks and edge functions)
CREATE POLICY "Service role can manage payments"
ON public.payments
FOR ALL
USING (auth.role() = 'service_role');

-- Create secure policy for users to view only their own payment records
CREATE POLICY "Users can view their own payments only"
ON public.payments
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Prevent direct user modifications to payment records (only system should modify)
-- No INSERT/UPDATE/DELETE policies for regular users - only service role can modify

-- Add additional security: Log any access attempts to payments table
CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log payment data access for security monitoring
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'payment_data_access',
    jsonb_build_object(
      'payment_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to log payment access for security monitoring
DROP TRIGGER IF EXISTS log_payment_access_trigger ON public.payments;
CREATE TRIGGER log_payment_access_trigger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_access();