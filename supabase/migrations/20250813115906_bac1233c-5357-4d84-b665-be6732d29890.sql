-- Manually allocate credits for the subscription that was created but didn't get credits allocated
INSERT INTO public.credit_purchases (
  user_id,
  email,
  credits_granted,
  expires_at,
  source_type,
  source_id
) VALUES (
  'ebaef0e7-9a46-494b-a31c-84a86e10308b',
  'damdam@gmail.com',
  200,
  '2025-09-13 11:53:22+00',
  'subscription',
  '5760c594-e031-4e5d-ae2d-2fb308274d5e'
);

-- Update user profile with new active credits
UPDATE public.user_profiles
SET credits = public.get_active_credits('ebaef0e7-9a46-494b-a31c-84a86e10308b'::uuid),
    credits_expire_at = (
      SELECT MIN(expires_at)
      FROM public.credit_purchases
      WHERE user_id = 'ebaef0e7-9a46-494b-a31c-84a86e10308b'
        AND status = 'active'
        AND expires_at > now()
    ),
    updated_at = now()
WHERE user_id = 'ebaef0e7-9a46-494b-a31c-84a86e10308b';