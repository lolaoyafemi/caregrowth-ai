
-- Create agency_profiles table
CREATE TABLE public.agency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agency_name text NOT NULL,
  service_area text,
  services_offered text[] DEFAULT '{}',
  ideal_client_type text,
  tone_preference text DEFAULT 'professional',
  caregiving_focus text[] DEFAULT ARRAY['caregiver burnout', 'hospital discharge stress', 'dementia care', 'loneliness', 'family guilt', 'respite care'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

-- Enable RLS
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

-- Agency admins can view their own agency profile
CREATE POLICY "Agency admins can view their own agency profile"
  ON public.agency_profiles FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

-- Agency admins can insert their own agency profile
CREATE POLICY "Agency admins can insert their own agency profile"
  ON public.agency_profiles FOR INSERT
  WITH CHECK (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

-- Agency admins can update their own agency profile
CREATE POLICY "Agency admins can update their own agency profile"
  ON public.agency_profiles FOR UPDATE
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

-- Super admins can manage all
CREATE POLICY "Super admins can manage agency profiles"
  ON public.agency_profiles FOR ALL
  USING (public.is_current_user_super_admin());

-- Service role full access
CREATE POLICY "Service role can manage agency profiles"
  ON public.agency_profiles FOR ALL
  USING (auth.role() = 'service_role');
