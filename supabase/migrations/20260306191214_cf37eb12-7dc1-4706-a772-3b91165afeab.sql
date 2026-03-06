ALTER TABLE public.content_posts 
ADD COLUMN IF NOT EXISTS headline text,
ADD COLUMN IF NOT EXISTS subheadline text;