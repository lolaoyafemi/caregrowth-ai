-- Create subscription table for tracking active subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_name TEXT NOT NULL,
  credits_per_cycle INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add subscription_id to user_profiles for easier reference
ALTER TABLE public.user_profiles 
ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Create function to allocate credits on subscription renewal
CREATE OR REPLACE FUNCTION public.allocate_subscription_credits(
  p_subscription_id UUID,
  p_credits INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add source tracking to credit_purchases
ALTER TABLE public.credit_purchases
ADD COLUMN source_type TEXT DEFAULT 'purchase', -- 'purchase' or 'subscription'
ADD COLUMN source_id UUID; -- references payment.id or subscription.id