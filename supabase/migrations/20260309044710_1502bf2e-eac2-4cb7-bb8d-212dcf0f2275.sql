-- Create voice practice sessions table
CREATE TABLE public.voice_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.training_scenarios(id) ON DELETE CASCADE,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_breakdown JSONB,
  feedback_summary JSONB,
  overall_score INTEGER,
  strengths TEXT[],
  improvements TEXT[],
  total_turns INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  audio_url TEXT, -- Reserved for future audio storage
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_voice_practice_sessions_user_id ON public.voice_practice_sessions(user_id);
CREATE INDEX idx_voice_practice_sessions_scenario_id ON public.voice_practice_sessions(scenario_id);
CREATE INDEX idx_voice_practice_sessions_agency_id ON public.voice_practice_sessions(agency_id);
CREATE INDEX idx_voice_practice_sessions_status ON public.voice_practice_sessions(status);
CREATE INDEX idx_voice_practice_sessions_created_at ON public.voice_practice_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.voice_practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own voice sessions"
  ON public.voice_practice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice sessions"
  ON public.voice_practice_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice sessions"
  ON public.voice_practice_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all voice sessions"
  ON public.voice_practice_sessions FOR SELECT
  TO authenticated
  USING (is_current_user_super_admin());

CREATE POLICY "Service role can manage voice sessions"
  ON public.voice_practice_sessions FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role');