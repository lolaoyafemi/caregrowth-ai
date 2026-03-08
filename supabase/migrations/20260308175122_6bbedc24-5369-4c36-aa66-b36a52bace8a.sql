ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS hook text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS post_type text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS template_style text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS topic_keywords text[] DEFAULT NULL;

COMMENT ON COLUMN public.content_posts.hook IS 'The hook/opening line of the post, stored for Content Memory deduplication.';
COMMENT ON COLUMN public.content_posts.post_type IS 'Post category: attract, connect, transact. Used for Content Memory rotation.';
COMMENT ON COLUMN public.content_posts.template_style IS 'Visual template used: quote_card, minimalist, dark_mode. Used for Content Memory rotation.';
COMMENT ON COLUMN public.content_posts.topic_keywords IS 'Auto-extracted keywords from caption for Content Memory repetition detection.';