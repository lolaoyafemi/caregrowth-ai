
-- 1. Restrict audit_log INSERT to service_role only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_log FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

-- 2. Remove user self-insert on credit_purchases (prevent self-granting credits)
DROP POLICY IF EXISTS "Users can insert their own credit purchases" ON public.credit_purchases;

-- 3. Guard user_profiles UPDATE against role/credits escalation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (SELECT role FROM public.user_profiles WHERE user_id = auth.uid())
  AND credits IS NOT DISTINCT FROM (SELECT credits FROM public.user_profiles WHERE user_id = auth.uid())
);

-- 4. Add UPDATE policy for content_batches (owner only)
CREATE POLICY "Users can update their own batches"
ON public.content_batches FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Restrict access to OAuth/secret token columns via column-level grants.
-- Revoke table-level SELECT, then grant SELECT only on non-sensitive columns.

-- connected_accounts
REVOKE SELECT ON public.connected_accounts FROM anon, authenticated;
GRANT SELECT (id, user_id, agency_id, platform, account_name, platform_account_id, platform_account_name, error_message, token_expires_at, is_connected, connected_at, created_at, updated_at)
  ON public.connected_accounts TO anon, authenticated;

-- drive_tokens
REVOKE SELECT ON public.drive_tokens FROM anon, authenticated;
GRANT SELECT (id, user_id, expires_in, scope, token_type, created_at)
  ON public.drive_tokens TO anon, authenticated;

-- google_connections
REVOKE SELECT ON public.google_connections FROM anon, authenticated;
GRANT SELECT (id, agency_id, user_id, google_user_id, google_email, expires_at, scope, selected_folder_id, selected_folder_name, created_at, updated_at)
  ON public.google_connections TO anon, authenticated;

-- openai_keys: hide secret_key from client (super-admins read via edge function / service role)
REVOKE SELECT ON public.openai_keys FROM anon, authenticated;
GRANT SELECT (id, key_name, active, created_at)
  ON public.openai_keys TO anon, authenticated;
