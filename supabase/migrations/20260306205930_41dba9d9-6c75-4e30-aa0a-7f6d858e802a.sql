ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS post_format text NOT NULL DEFAULT 'single';
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS slide_texts text[] DEFAULT NULL;
COMMENT ON COLUMN public.content_posts.post_format IS 'single or carousel';
COMMENT ON COLUMN public.content_posts.slide_texts IS 'Array of slide texts for carousel posts';