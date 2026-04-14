
-- Scenarios table
CREATE TABLE public.scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  scenario_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'conversation' CHECK (category IN ('compliance', 'conversation', 'emergency', 'objection')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ideal_answer TEXT,
  common_mistakes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage scenarios" ON public.scenarios FOR ALL
  USING (is_current_user_super_admin());

CREATE POLICY "Authenticated users can view active scenarios" ON public.scenarios FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Scenario attempts table
CREATE TABLE public.scenario_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_response TEXT NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  strengths TEXT,
  improvements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON public.scenario_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON public.scenario_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all attempts" ON public.scenario_attempts FOR SELECT
  USING (is_current_user_super_admin());

CREATE POLICY "Service role can manage attempts" ON public.scenario_attempts FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_scenarios_category ON public.scenarios(category);
CREATE INDEX idx_scenarios_active ON public.scenarios(is_active);
CREATE INDEX idx_scenario_attempts_user ON public.scenario_attempts(user_id);
CREATE INDEX idx_scenario_attempts_scenario ON public.scenario_attempts(scenario_id);

-- Timestamp trigger
CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();
