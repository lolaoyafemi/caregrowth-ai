-- Create function to get user drive tokens (temporary solution until types are updated)
CREATE OR REPLACE FUNCTION public.get_user_drive_tokens(user_id UUID)
RETURNS TABLE(
  access_token TEXT,
  refresh_token TEXT,
  expires_in INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT access_token, refresh_token, expires_in, created_at
  FROM public.drive_tokens
  WHERE drive_tokens.user_id = get_user_drive_tokens.user_id
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_drive_tokens(UUID) TO authenticated;

-- Fix the RLS policy issue for drive_tokens table
ALTER TABLE public.drive_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for drive_tokens
CREATE POLICY "Users can view their own drive tokens" 
ON public.drive_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drive tokens" 
ON public.drive_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive tokens" 
ON public.drive_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- System can manage drive tokens for OAuth callback
CREATE POLICY "Service role can manage drive tokens" 
ON public.drive_tokens 
FOR ALL 
USING (auth.role() = 'service_role');