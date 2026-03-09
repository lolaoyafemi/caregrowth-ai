
-- 1. Agency Intelligence Profile
CREATE TABLE public.agency_intelligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  services_offered text[] DEFAULT '{}',
  care_specialties text[] DEFAULT '{}',
  service_locations text[] DEFAULT '{}',
  insurance_accepted text[] DEFAULT '{}',
  pricing_model text DEFAULT 'hourly',
  target_client_type text,
  brand_voice text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

ALTER TABLE public.agency_intelligence_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view own intelligence profile"
  ON public.agency_intelligence_profiles FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can insert own intelligence profile"
  ON public.agency_intelligence_profiles FOR INSERT
  WITH CHECK (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can update own intelligence profile"
  ON public.agency_intelligence_profiles FOR UPDATE
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Super admins can manage intelligence profiles"
  ON public.agency_intelligence_profiles FOR ALL
  USING (public.is_current_user_super_admin());

CREATE POLICY "Service role can manage intelligence profiles"
  ON public.agency_intelligence_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Content Performance Intelligence
CREATE TABLE public.content_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.content_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  impressions integer DEFAULT 0,
  engagement integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  clicks integer DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.content_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content performance"
  ON public.content_performance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content performance"
  ON public.content_performance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage content performance"
  ON public.content_performance FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all content performance"
  ON public.content_performance FOR SELECT
  USING (public.is_current_user_super_admin());

-- 3. Lead Signal Detection
CREATE TABLE public.lead_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  post_id uuid REFERENCES public.content_posts(id) ON DELETE SET NULL,
  commenter_name text,
  comment_text text,
  lead_probability_score numeric DEFAULT 0,
  suggested_reply text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view own lead signals"
  ON public.lead_signals FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can update own lead signals"
  ON public.lead_signals FOR UPDATE
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Service role can manage lead signals"
  ON public.lead_signals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all lead signals"
  ON public.lead_signals FOR SELECT
  USING (public.is_current_user_super_admin());

-- 4. Reputation Response Assistant
CREATE TABLE public.review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  reviewer_name text,
  review_text text,
  sentiment_score numeric,
  ai_suggested_reply text,
  response_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view own review responses"
  ON public.review_responses FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can update own review responses"
  ON public.review_responses FOR UPDATE
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can insert own review responses"
  ON public.review_responses FOR INSERT
  WITH CHECK (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Service role can manage review responses"
  ON public.review_responses FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all review responses"
  ON public.review_responses FOR SELECT
  USING (public.is_current_user_super_admin());

-- 5. Compliance Guardian Layer
CREATE TABLE public.content_compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.content_posts(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  flagged_text text,
  suggested_revision text,
  severity_level text NOT NULL DEFAULT 'low',
  resolved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.content_compliance_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance flags"
  ON public.content_compliance_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage compliance flags"
  ON public.content_compliance_flags FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all compliance flags"
  ON public.content_compliance_flags FOR SELECT
  USING (public.is_current_user_super_admin());

-- 6. Intake Intelligence Engine
CREATE TABLE public.intake_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  conversation_type text NOT NULL DEFAULT 'general_inquiry',
  user_input text,
  ai_guided_questions jsonb DEFAULT '[]',
  summary_output text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view own intake conversations"
  ON public.intake_conversations FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can insert own intake conversations"
  ON public.intake_conversations FOR INSERT
  WITH CHECK (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Agency admins can update own intake conversations"
  ON public.intake_conversations FOR UPDATE
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Service role can manage intake conversations"
  ON public.intake_conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all intake conversations"
  ON public.intake_conversations FOR SELECT
  USING (public.is_current_user_super_admin());

-- 7. Predictive Assistant Infrastructure
CREATE TABLE public.usage_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  pattern_detected text,
  suggested_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view own usage patterns"
  ON public.usage_patterns FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE admin_user_id = auth.uid()));

CREATE POLICY "Service role can manage usage patterns"
  ON public.usage_patterns FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all usage patterns"
  ON public.usage_patterns FOR SELECT
  USING (public.is_current_user_super_admin());
