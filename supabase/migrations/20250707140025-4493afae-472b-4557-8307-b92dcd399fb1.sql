-- SECURITY AUDIT FIXES: Phase 1 - Fix role constraints and add security infrastructure

-- 1. First, check and fix any invalid roles in existing data
UPDATE public.users 
SET role = 'admin' 
WHERE role NOT IN ('user', 'admin', 'content_writer', 'collaborator', 'agency_admin', 'super_admin');

-- Now add the constraint with super_admin included
ALTER TABLE public.users 
ADD CONSTRAINT check_role_assignment 
CHECK (role IN ('user', 'admin', 'content_writer', 'collaborator', 'agency_admin', 'super_admin'));

-- 2. Add audit table for tracking role changes
CREATE TABLE public.role_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_role TEXT,
    new_role TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reason TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view role audit logs" 
ON public.role_audit_log 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
);

-- System can insert audit logs
CREATE POLICY "System can insert role audit logs" 
ON public.role_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 3. Add security logging for sensitive operations
CREATE TABLE public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only super admins can view security events
CREATE POLICY "Super admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
);

-- System can insert security events
CREATE POLICY "System can log security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 4. Add function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type TEXT,
    event_data JSONB DEFAULT '{}',
    target_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.security_events (user_id, event_type, event_data)
    VALUES (COALESCE(target_user_id, auth.uid()), event_type, event_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add constraints to prevent negative credits
ALTER TABLE public.users 
ADD CONSTRAINT check_credits_non_negative 
CHECK (credits >= 0);

-- Fix any negative credits first
UPDATE public.user_profiles SET credits = 0 WHERE credits < 0;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT check_profile_credits_non_negative 
CHECK (credits >= 0);