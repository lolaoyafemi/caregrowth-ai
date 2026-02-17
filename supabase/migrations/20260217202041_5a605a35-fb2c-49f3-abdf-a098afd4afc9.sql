
-- Add platform-specific fields to connected_accounts
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS platform_account_id text,
  ADD COLUMN IF NOT EXISTS platform_account_name text,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Add published_at and platform_post_id to content_posts
ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS platform_post_id text,
  ADD COLUMN IF NOT EXISTS error_message text;
