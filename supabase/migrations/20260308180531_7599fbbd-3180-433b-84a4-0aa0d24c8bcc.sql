
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS agency_id uuid DEFAULT NULL;
COMMENT ON COLUMN public.connected_accounts.agency_id IS 'Optional agency reference for agency-level account connections.';
