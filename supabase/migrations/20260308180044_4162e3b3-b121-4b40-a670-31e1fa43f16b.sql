
-- Add new columns to content_posts
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS core_message text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS caption_instagram text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS caption_linkedin text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS caption_facebook text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS caption_x text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS publish_skipped_reason text DEFAULT NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS carousel_image_urls text[] DEFAULT NULL;

-- Add subline column (distinct from existing subheadline for new schema)
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS subline text DEFAULT NULL;

-- Add agency_id to content_batches (nullable for backward compat with existing user_id rows)
ALTER TABLE public.content_batches ADD COLUMN IF NOT EXISTS agency_id uuid DEFAULT NULL;

COMMENT ON COLUMN public.content_posts.core_message IS 'The core message/theme of the post before platform adaptation.';
COMMENT ON COLUMN public.content_posts.caption_instagram IS 'Platform-specific caption for Instagram.';
COMMENT ON COLUMN public.content_posts.caption_linkedin IS 'Platform-specific caption for LinkedIn.';
COMMENT ON COLUMN public.content_posts.caption_facebook IS 'Platform-specific caption for Facebook.';
COMMENT ON COLUMN public.content_posts.caption_x IS 'Platform-specific caption for X/Twitter.';
COMMENT ON COLUMN public.content_posts.subline IS 'Subline text displayed under the headline on the post image.';
COMMENT ON COLUMN public.content_posts.publish_skipped_reason IS 'Reason a post was skipped during publishing.';
COMMENT ON COLUMN public.content_posts.carousel_image_urls IS 'Array of image URLs for carousel posts.';
COMMENT ON COLUMN public.content_batches.agency_id IS 'Optional agency reference for agency-level content batches.';
