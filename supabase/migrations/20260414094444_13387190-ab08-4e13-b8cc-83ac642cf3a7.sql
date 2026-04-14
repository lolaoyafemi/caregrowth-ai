
-- Signal history for trend tracking
CREATE TABLE public.signal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  visibility_score float NOT NULL DEFAULT 0,
  engagement_score float NOT NULL DEFAULT 0,
  conversion_score float NOT NULL DEFAULT 0,
  momentum_score float NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_signal_history_user_date ON public.signal_history (user_id, date DESC);

ALTER TABLE public.signal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage signal history"
  ON public.signal_history FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own signal history"
  ON public.signal_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all signal history"
  ON public.signal_history FOR SELECT
  USING (is_current_user_super_admin());
