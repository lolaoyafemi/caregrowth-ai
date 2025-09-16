-- Fix function search path security warnings

-- Fix encrypt_sensitive_data function
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use pgcrypto extension for encryption (assuming it's available)
  -- In production, you'd want to use a proper encryption key from secrets
  RETURN encode(digest(data, 'sha256'), 'hex');
END;
$$;

-- Fix log_admin_action function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  );
END;
$$;

-- Fix assign_user_role function
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id uuid,
  p_new_role text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_role text;
  v_current_user_role text;
BEGIN
  -- Only super admins can assign roles
  IF NOT is_current_user_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Only super administrators can assign roles';
  END IF;

  -- Get current role
  SELECT role INTO v_old_role FROM public.user_profiles WHERE user_id = p_user_id;
  SELECT role INTO v_current_user_role FROM public.user_profiles WHERE user_id = auth.uid();

  -- Prevent non-super-admins from escalating to super_admin
  IF p_new_role = 'super_admin' AND v_current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied: Cannot assign super_admin role';
  END IF;

  -- Update the role
  UPDATE public.user_profiles 
  SET role = p_new_role, updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the role change
  INSERT INTO public.role_audit_log (
    user_id,
    old_role,
    new_role,
    reason,
    changed_by
  ) VALUES (
    p_user_id,
    v_old_role,
    p_new_role,
    p_reason,
    auth.uid()
  );

  -- Log in audit trail
  PERFORM public.log_admin_action(
    'role_change',
    'user',
    p_user_id::text,
    jsonb_build_object('old_role', v_old_role),
    jsonb_build_object('new_role', p_new_role, 'reason', p_reason)
  );
END;
$$;

-- Fix cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.user_sessions 
  WHERE expires_at < now() OR last_activity < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Fix validate_payment_access function
CREATE OR REPLACE FUNCTION public.validate_payment_access(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_user_id uuid;
BEGIN
  -- Get the user_id for this payment
  SELECT user_id INTO payment_user_id 
  FROM public.payments 
  WHERE id = p_payment_id;
  
  -- Allow access if user owns the payment or is super admin
  RETURN payment_user_id = auth.uid() OR is_current_user_super_admin();
END;
$$;

-- Fix anonymize_old_financial_data function
CREATE OR REPLACE FUNCTION public.anonymize_old_financial_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anonymized_count integer;
BEGIN
  -- Only super admins can run this
  IF NOT is_current_user_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Only super administrators can anonymize data';
  END IF;

  -- Anonymize email addresses in old sales logs (older than 2 years)
  UPDATE public.credit_sales_log 
  SET email = 'anonymized_' || id::text || '@domain.com'
  WHERE timestamp < now() - interval '2 years' 
    AND email NOT LIKE 'anonymized_%';
  
  GET DIAGNOSTICS anonymized_count = ROW_COUNT;
  
  -- Log the anonymization
  PERFORM public.log_admin_action(
    'data_anonymization',
    'credit_sales_log',
    NULL,
    NULL,
    jsonb_build_object('anonymized_records', anonymized_count)
  );
  
  RETURN anonymized_count;
END;
$$;