-- Training Scenarios extracted from documents
CREATE TABLE public.training_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.shared_documents(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'conversation',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  context TEXT,
  prompt_to_user TEXT NOT NULL,
  expected_key_points TEXT[],
  difficulty_level TEXT DEFAULT 'medium',
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User responses to training scenarios
CREATE TABLE public.training_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES public.training_scenarios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_response TEXT NOT NULL,
  ai_evaluation JSONB,
  score INTEGER,
  strengths TEXT[],
  improvements TEXT[],
  example_response TEXT,
  time_spent_seconds INTEGER,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User progress tracking
CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  scenarios_completed INTEGER DEFAULT 0,
  scenarios_attempted INTEGER DEFAULT 0,
  average_score NUMERIC(5,2),
  best_score INTEGER,
  total_time_spent INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Analytics aggregates for common mistakes
CREATE TABLE public.training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES public.training_scenarios(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  average_score NUMERIC(5,2),
  common_mistakes JSONB DEFAULT '[]'::jsonb,
  difficulty_rating NUMERIC(3,2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_scenarios
CREATE POLICY "All authenticated users can view active scenarios"
ON public.training_scenarios FOR SELECT
USING (is_active = true AND auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage all scenarios"
ON public.training_scenarios FOR ALL
USING (is_current_user_super_admin());

-- RLS Policies for training_responses
CREATE POLICY "Users can view their own responses"
ON public.training_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses"
ON public.training_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all responses"
ON public.training_responses FOR SELECT
USING (is_current_user_super_admin());

-- RLS Policies for training_progress
CREATE POLICY "Users can view their own progress"
ON public.training_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress"
ON public.training_progress FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all progress"
ON public.training_progress FOR SELECT
USING (is_current_user_super_admin());

-- RLS Policies for training_analytics
CREATE POLICY "All authenticated users can view analytics"
ON public.training_analytics FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage analytics"
ON public.training_analytics FOR ALL
USING (is_current_user_super_admin());

CREATE POLICY "Service role can manage analytics"
ON public.training_analytics FOR ALL
USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX idx_training_scenarios_category ON public.training_scenarios(category);
CREATE INDEX idx_training_scenarios_document_id ON public.training_scenarios(document_id);
CREATE INDEX idx_training_responses_user_id ON public.training_responses(user_id);
CREATE INDEX idx_training_responses_scenario_id ON public.training_responses(scenario_id);
CREATE INDEX idx_training_progress_user_id ON public.training_progress(user_id);

-- Trigger to update timestamps
CREATE TRIGGER update_training_scenarios_updated_at
  BEFORE UPDATE ON public.training_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER update_training_progress_updated_at
  BEFORE UPDATE ON public.training_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();