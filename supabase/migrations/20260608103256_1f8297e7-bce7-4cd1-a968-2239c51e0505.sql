DROP POLICY IF EXISTS "Users can view their own drive tokens" ON public.drive_tokens;
DROP POLICY IF EXISTS "Users can insert their own drive tokens" ON public.drive_tokens;
DROP POLICY IF EXISTS "Users can update their own drive tokens" ON public.drive_tokens;
REVOKE ALL ON public.drive_tokens FROM anon, authenticated;