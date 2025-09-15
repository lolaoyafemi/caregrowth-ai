-- Fix security vulnerability: Restrict social_posts access to owners only

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.social_posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.social_posts;

-- Create secure RLS policies for social_posts
CREATE POLICY "Users can view their own posts only" 
ON public.social_posts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts only" 
ON public.social_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts only" 
ON public.social_posts 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts only" 
ON public.social_posts 
FOR DELETE 
USING (auth.uid() = user_id);