ALTER TABLE public.user_state
  ADD COLUMN IF NOT EXISTS engagement_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS momentum_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS momentum_label text NOT NULL DEFAULT 'Losing traction',
  ADD COLUMN IF NOT EXISTS last_signal_update timestamp with time zone;