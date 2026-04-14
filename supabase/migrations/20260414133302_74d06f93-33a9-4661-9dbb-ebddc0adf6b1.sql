
-- Create scenario_triggers table
CREATE TABLE public.scenario_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('conversation', 'mistake', 'knowledge')),
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scenario_triggers ENABLE ROW LEVEL SECURITY;

-- Users can view their own triggers
CREATE POLICY "Users can view own triggers"
  ON public.scenario_triggers FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all triggers
CREATE POLICY "Service role manages triggers"
  ON public.scenario_triggers FOR ALL
  USING (auth.role() = 'service_role');

-- Add columns to existing scenarios table
ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trigger_id UUID REFERENCES public.scenario_triggers(id);

-- Index for efficient lookups
CREATE INDEX idx_scenario_triggers_user_status ON public.scenario_triggers(user_id, status);
CREATE INDEX idx_scenarios_trigger_id ON public.scenarios(trigger_id) WHERE trigger_id IS NOT NULL;
