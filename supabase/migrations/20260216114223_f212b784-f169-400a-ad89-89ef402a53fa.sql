
-- Table for storing connected social media accounts
CREATE TABLE public.connected_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'x')),
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected accounts"
  ON public.connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected accounts"
  ON public.connected_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts"
  ON public.connected_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts"
  ON public.connected_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Table for scheduled posts in the content calendar
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'x')),
  content TEXT NOT NULL,
  hook TEXT,
  body TEXT,
  cta TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'draft')),
  error_message TEXT,
  prompt_category TEXT,
  tone TEXT,
  audience TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all scheduled posts"
  ON public.scheduled_posts FOR ALL
  USING (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_connected_accounts_user_id ON public.connected_accounts(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
