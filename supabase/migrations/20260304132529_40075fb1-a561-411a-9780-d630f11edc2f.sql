
-- Fix audit_log: restrict system insert to service_role or authenticated users logging their own actions
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "System can insert audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Fix credit_purchases: restrict system insert and update to service_role
DROP POLICY IF EXISTS "System can insert credit purchases" ON public.credit_purchases;
CREATE POLICY "System can insert credit purchases" ON public.credit_purchases
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "System can update credit purchases" ON public.credit_purchases;
CREATE POLICY "System can update credit purchases" ON public.credit_purchases
  FOR UPDATE USING (auth.role() = 'service_role');

-- Fix credit_usage_log: restrict to service_role
DROP POLICY IF EXISTS "edge_functions_can_insert_usage" ON public.credit_usage_log;
CREATE POLICY "edge_functions_can_insert_usage" ON public.credit_usage_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fix role_audit_log: restrict to service_role
DROP POLICY IF EXISTS "System can insert role audit logs" ON public.role_audit_log;
CREATE POLICY "System can insert role audit logs" ON public.role_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fix security_events: restrict to service_role
DROP POLICY IF EXISTS "System can log security events" ON public.security_events;
CREATE POLICY "System can log security events" ON public.security_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fix support_responses: restrict insert to ticket owner or super admin
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.support_responses;
CREATE POLICY "Authenticated users can insert responses to their tickets" ON public.support_responses
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE support_tickets.id = support_responses.ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );
