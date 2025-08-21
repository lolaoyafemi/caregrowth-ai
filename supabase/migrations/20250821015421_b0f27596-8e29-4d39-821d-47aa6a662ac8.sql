-- Fix function search path security issues
-- Update functions that don't have search_path set

-- Fix deduct_credits_and_log function
CREATE OR REPLACE FUNCTION public.deduct_credits_and_log(p_user_id uuid, p_tool text, p_credits_used integer, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_credits integer;
  v_new_credits integer;
  v_log_id uuid;
BEGIN
  -- Get current credit balance
  SELECT credits INTO v_current_credits
  FROM public.users
  WHERE id = p_user_id;

  -- Check if user exists
  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if user has enough credits
  IF v_current_credits < p_credits_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_credits', v_current_credits,
      'required_credits', p_credits_used
    );
  END IF;

  -- Calculate new credit balance
  v_new_credits := v_current_credits - p_credits_used;

  -- Deduct credits from user account
  UPDATE public.user_profiles
  SET credits = v_new_credits,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the credit usage
  INSERT INTO public.credit_usage_log (user_id, tool, credits_used, description)
  VALUES (p_user_id, p_tool, p_credits_used, p_description)
  RETURNING id INTO v_log_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'previous_credits', v_current_credits,
    'credits_used', p_credits_used,
    'remaining_credits', v_new_credits,
    'log_id', v_log_id
  );
END;
$function$;

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_data jsonb DEFAULT '{}'::jsonb, target_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.security_events (user_id, event_type, event_data)
    VALUES (COALESCE(target_user_id, auth.uid()), event_type, event_data);
END;
$function$;