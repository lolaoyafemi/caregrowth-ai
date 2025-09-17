-- Create agencies table if it doesn't exist (adapting to current user structure)
CREATE TABLE IF NOT EXISTS public.agencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert agencies based on existing agency_admin users
INSERT INTO public.agencies (name, admin_user_id)
SELECT 
    COALESCE(up.business_name, 'Agency for ' || u.email) as name,
    u.id as admin_user_id
FROM auth.users u
JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.role = 'agency_admin'
ON CONFLICT DO NOTHING;

-- Table: google_connections
CREATE TABLE IF NOT EXISTS public.google_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_user_id text NOT NULL,
    google_email text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    scope text,
    selected_folder_id text,
    selected_folder_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_connections_agency_id 
    ON public.google_connections(agency_id);

CREATE INDEX IF NOT EXISTS idx_google_connections_user_id 
    ON public.google_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_google_connections_google_user_id 
    ON public.google_connections(google_user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_timestamp_google_connections
    BEFORE UPDATE ON public.google_connections
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies
CREATE POLICY "Agency admins can view their own agency"
    ON public.agencies
    FOR SELECT USING (admin_user_id = auth.uid());

CREATE POLICY "Agency admins can update their own agency"
    ON public.agencies
    FOR UPDATE USING (admin_user_id = auth.uid());

-- RLS Policies for google_connections
CREATE POLICY "Users can view their own google connections"
    ON public.google_connections
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own google connections"
    ON public.google_connections
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own google connections"
    ON public.google_connections
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own google connections"
    ON public.google_connections
    FOR DELETE USING (user_id = auth.uid());