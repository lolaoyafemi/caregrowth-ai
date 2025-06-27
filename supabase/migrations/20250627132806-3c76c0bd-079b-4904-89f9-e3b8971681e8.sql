
-- First, let's check what policies exist and drop them to recreate properly
DROP POLICY IF EXISTS "Users can view their own credit purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Users can insert their own credit purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "System can insert credit purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "System can update credit purchases" ON public.credit_purchases;

-- Now create the correct policies
CREATE POLICY "Users can view their own credit purchases" 
  ON public.credit_purchases 
  FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own credit purchases" 
  ON public.credit_purchases 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert credit purchases" 
  ON public.credit_purchases 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update credit purchases" 
  ON public.credit_purchases 
  FOR UPDATE 
  USING (true);
