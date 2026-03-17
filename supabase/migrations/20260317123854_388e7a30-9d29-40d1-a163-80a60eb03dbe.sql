
-- Social conversations table for storing comments/engagements from connected platforms
CREATE TABLE public.social_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.content_posts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  platform_comment_id text,
  commenter_name text,
  commenter_avatar_url text,
  comment_text text NOT NULL,
  parent_comment_id uuid REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  ai_classification text DEFAULT 'general_engagement',
  ai_suggested_reply text,
  status text NOT NULL DEFAULT 'new',
  replied_at timestamp with time zone,
  reply_text text,
  engagement_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own conversations"
  ON public.social_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.social_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.social_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.social_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_social_conversations_user_id ON public.social_conversations(user_id);
CREATE INDEX idx_social_conversations_status ON public.social_conversations(status);
CREATE INDEX idx_social_conversations_platform ON public.social_conversations(platform);
CREATE INDEX idx_social_conversations_created_at ON public.social_conversations(created_at DESC);
