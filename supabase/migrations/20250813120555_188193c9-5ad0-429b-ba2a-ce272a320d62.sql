-- Clean up duplicate active subscriptions for same user (keep the most recent one)
UPDATE public.subscriptions 
SET status = 'canceled'
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.subscriptions 
    WHERE status = 'active'
  ) ranked
  WHERE rn > 1
);