-- SECURITY AUDIT FIXES: Enforce stricter RLS policies and add security constraints

-- 1. Fix potential privilege escalation in admin role assignments
-- Add constraint to prevent users from setting their own role to super_admin
ALTER TABLE public.users 
ADD CONSTRAINT check_role_assignment 
CHECK (role IN ('user', 'admin', 'content_writer', 'collaborator', 'agency_admin'));

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

-- 3. Create security function to validate role changes
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only super_admin can assign super_admin role
    IF NEW.role = 'super_admin' AND OLD.role != 'super_admin' THEN
        -- Check if the user making the change is super_admin
        IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role = 'super_admin'
        ) THEN
            RAISE EXCEPTION 'Only super administrators can assign super_admin role';
        END IF;
    END IF;
    
    -- Log the role change
    INSERT INTO public.role_audit_log (user_id, old_role, new_role, changed_by, reason)
    VALUES (NEW.id, OLD.role, NEW.role, auth.uid(), 'Role change via update');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for role validation
CREATE TRIGGER validate_role_change_trigger
    BEFORE UPDATE OF role ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_change();

-- 4. Strengthen RLS on sensitive tables
-- Update users table RLS to prevent self-role escalation
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
CREATE POLICY "Users can update their own data except role" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    -- Prevent role changes through user updates (must use admin functions)
    (OLD.role = NEW.role OR 
     EXISTS (
         SELECT 1 FROM public.users 
         WHERE users.id = auth.uid() AND users.role = 'super_admin'
     ))
);

-- 5. Add rate limiting table for API calls
CREATE TABLE public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view their own rate limits" 
ON public.api_rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert rate limit data
CREATE POLICY "System can manage rate limits" 
ON public.api_rate_limits 
FOR ALL 
USING (true);

-- 6. Add security logging for sensitive operations
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

-- 7. Add function to log security events
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

-- 8. Strengthen credit_purchases RLS
-- Ensure users can't manipulate credit purchases
DROP POLICY IF EXISTS "System can update credit purchases" ON public.credit_purchases;
CREATE POLICY "Only service role can update credit purchases" 
ON public.credit_purchases 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- 9. Add constraint to prevent negative credits
ALTER TABLE public.users 
ADD CONSTRAINT check_credits_non_negative 
CHECK (credits >= 0);

ALTER TABLE public.user_profiles 
ADD CONSTRAINT check_profile_credits_non_negative 
CHECK (credits >= 0);

-- 10. Add session tracking for better security monitoring
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token_hash TEXT, -- Hash of the session token
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS on user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can manage sessions
CREATE POLICY "System can manage user sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.role() = 'service_role');