-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.allocate_subscription_credits(
  p_subscription_id UUID,
  p_credits INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  subscription_record RECORD;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Get subscription details
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE id = p_subscription_id AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE LOG 'Subscription not found or not active: %', p_subscription_id;
    RETURN FALSE;
  END IF;
  
  -- Set expiration to end of current billing period
  expires_at := subscription_record.current_period_end;
  
  -- Create credit purchase record
  INSERT INTO public.credit_purchases (
    user_id,
    email,
    credits_granted,
    expires_at,
    source_type,
    source_id
  ) VALUES (
    subscription_record.user_id,
    subscription_record.email,
    p_credits,
    expires_at,
    'subscription',
    p_subscription_id
  );
  
  -- Update user profile with new active credits
  UPDATE public.user_profiles
  SET credits = public.get_active_credits(subscription_record.user_id),
      credits_expire_at = (
        SELECT MIN(expires_at)
        FROM public.credit_purchases
        WHERE user_id = subscription_record.user_id
          AND status = 'active'
          AND expires_at > now()
      ),
      updated_at = now()
  WHERE user_id = subscription_record.user_id;
  
  RAISE LOG 'Allocated % credits for subscription %', p_credits, p_subscription_id;
  RETURN TRUE;
END;
$$;