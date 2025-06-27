
-- Add expiration tracking to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN credits_expire_at TIMESTAMP WITH TIME ZONE;

-- Create a table to track credit purchases with expiration
CREATE TABLE public.credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  credits_granted INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed'))
);

-- Add RLS policies for credit_purchases
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit purchases" 
  ON public.credit_purchases 
  FOR SELECT 
  USING (auth.uid()::text = user_id::text);

-- Create function to get active (non-expired) credits for a user
CREATE OR REPLACE FUNCTION public.get_active_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_active_credits INTEGER := 0;
BEGIN
  -- Get sum of active credits that haven't expired
  SELECT COALESCE(SUM(credits_granted), 0)
  INTO total_active_credits
  FROM public.credit_purchases
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND expires_at > now();
    
  RETURN total_active_credits;
END;
$$;

-- Create function to expire old credits
CREATE OR REPLACE FUNCTION public.expire_old_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Mark expired credits
  UPDATE public.credit_purchases
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= now();
    
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Update user profiles to reflect current active credits
  UPDATE public.user_profiles
  SET credits = public.get_active_credits(user_id::uuid),
      updated_at = now()
  WHERE user_id IN (
    SELECT DISTINCT user_id 
    FROM public.credit_purchases 
    WHERE status = 'expired'
  );
  
  RETURN expired_count;
END;
$$;

-- Create function to deduct credits (FIFO - oldest first)
CREATE OR REPLACE FUNCTION public.deduct_credits_fifo(p_user_id UUID, p_credits_to_deduct INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remaining_to_deduct INTEGER := p_credits_to_deduct;
  purchase_record RECORD;
  credits_from_purchase INTEGER;
  total_available INTEGER;
BEGIN
  -- First check if user has enough active credits
  SELECT public.get_active_credits(p_user_id) INTO total_available;
  
  IF total_available < p_credits_to_deduct THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'available_credits', total_available,
      'requested_credits', p_credits_to_deduct
    );
  END IF;
  
  -- Deduct credits FIFO (oldest purchases first)
  FOR purchase_record IN 
    SELECT id, credits_granted, expires_at
    FROM public.credit_purchases
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND expires_at > now()
      AND credits_granted > 0
    ORDER BY created_at ASC
  LOOP
    IF remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;
    
    credits_from_purchase := LEAST(purchase_record.credits_granted, remaining_to_deduct);
    
    -- Update the purchase record
    UPDATE public.credit_purchases
    SET credits_granted = credits_granted - credits_from_purchase,
        status = CASE 
          WHEN credits_granted - credits_from_purchase <= 0 THEN 'consumed'
          ELSE 'active'
        END
    WHERE id = purchase_record.id;
    
    remaining_to_deduct := remaining_to_deduct - credits_from_purchase;
  END LOOP;
  
  -- Update user profile with current active credits
  UPDATE public.user_profiles
  SET credits = public.get_active_credits(p_user_id),
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', p_credits_to_deduct,
    'remaining_credits', public.get_active_credits(p_user_id)
  );
END;
$$;

-- Update the allocate_credits_after_payment function to use the new system
CREATE OR REPLACE FUNCTION public.allocate_credits_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only proceed if payment status is 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Create credit purchase record with 1 month expiration
    INSERT INTO public.credit_purchases (
      user_id, 
      email, 
      credits_granted, 
      expires_at
    ) VALUES (
      NEW.user_id, 
      NEW.email, 
      NEW.credits_granted, 
      now() + interval '1 month'
    );
    
    -- Update user profile with current active credits
    UPDATE public.user_profiles
    SET credits = public.get_active_credits(NEW.user_id),
        credits_expire_at = (
          SELECT MIN(expires_at) 
          FROM public.credit_purchases 
          WHERE user_id = NEW.user_id 
            AND status = 'active' 
            AND expires_at > now()
        ),
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    RAISE LOG 'Credits allocated: % credits to user % (expires: %)',
      NEW.credits_granted,
      NEW.user_id,
      now() + interval '1 month';
  END IF;
  
  RETURN NEW;
END;
$$;
