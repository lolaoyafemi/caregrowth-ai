-- Create user_state table for decision engine
CREATE TABLE public.user_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  visibility_state text NOT NULL DEFAULT 'empty',
  engagement_state text NOT NULL DEFAULT 'dead',
  conversion_state text NOT NULL DEFAULT 'none',
  queue_count integer NOT NULL DEFAULT 0,
  last_post_date timestamp with time zone,
  last_engagement_date timestamp with time zone,
  last_conversion_signal timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_state_user_id_key UNIQUE (user_id),
  CONSTRAINT user_state_visibility_check CHECK (visibility_state IN ('active', 'low', 'empty')),
  CONSTRAINT user_state_engagement_check CHECK (engagement_state IN ('high', 'low', 'dead')),
  CONSTRAINT user_state_conversion_check CHECK (conversion_state IN ('active', 'passive', 'none'))
);

-- Enable RLS
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- Users can view their own state
CREATE POLICY "Users can view own state"
  ON public.user_state FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own state
CREATE POLICY "Users can insert own state"
  ON public.user_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own state
CREATE POLICY "Users can update own state"
  ON public.user_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role has full access for automated updates
CREATE POLICY "Service role can manage all state"
  ON public.user_state FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE TRIGGER update_user_state_updated_at
  BEFORE UPDATE ON public.user_state
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();

-- Index for fast lookups
CREATE INDEX idx_user_state_user_id ON public.user_state(user_id);