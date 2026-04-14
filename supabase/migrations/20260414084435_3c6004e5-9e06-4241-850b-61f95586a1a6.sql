
-- Content Pipeline: tracks visibility health per user
CREATE TABLE public.content_pipeline (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  queue_count integer NOT NULL DEFAULT 0,
  last_post_date timestamp with time zone,
  next_post_date timestamp with time zone,
  status text NOT NULL DEFAULT 'empty' CHECK (status IN ('active', 'low', 'empty')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.content_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pipeline" ON public.content_pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pipeline" ON public.content_pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pipeline" ON public.content_pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage pipelines" ON public.content_pipeline FOR ALL USING (auth.role() = 'service_role');

-- Engagement Logs: records interactions on posts
CREATE TABLE public.engagement_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.content_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'like' CHECK (type IN ('comment', 'like', 'dm', 'share', 'save')),
  intent text NOT NULL DEFAULT 'neutral' CHECK (intent IN ('lead', 'neutral', 'ignore')),
  source_name text,
  source_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagement logs" ON public.engagement_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage engagement logs" ON public.engagement_logs FOR ALL USING (auth.role() = 'service_role');

-- Interventions: smart alerts surfaced on dashboard
CREATE TABLE public.interventions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('visibility_risk', 'engagement_opportunity', 'scenario_failure', 'content_gap')),
  message text NOT NULL,
  action_label text NOT NULL DEFAULT 'Fix',
  action_path text NOT NULL DEFAULT '/dashboard',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interventions" ON public.interventions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own interventions" ON public.interventions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage interventions" ON public.interventions FOR ALL USING (auth.role() = 'service_role');

-- Timestamp triggers
CREATE TRIGGER update_content_pipeline_updated_at BEFORE UPDATE ON public.content_pipeline FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
