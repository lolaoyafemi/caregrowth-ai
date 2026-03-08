ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS service_area text DEFAULT NULL;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS tone_preference text DEFAULT 'warm';
COMMENT ON COLUMN public.user_profiles.service_area IS 'Geographic service area for the agency';
COMMENT ON COLUMN public.user_profiles.tone_preference IS 'Preferred content tone: warm, professional, conversational, etc.';