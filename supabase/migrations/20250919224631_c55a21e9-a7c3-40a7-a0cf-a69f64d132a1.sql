-- Update user roles - most users should be 'admin' to see the dashboard content
UPDATE user_profiles 
SET role = 'admin', updated_at = now()
WHERE role = 'user' AND user_id != 'ffd4df5d-9385-4596-9040-87d72ffca397';

-- Keep one user as super_admin for testing (if none exists)
UPDATE user_profiles 
SET role = 'super_admin', updated_at = now() 
WHERE user_id = 'ffd4df5d-9385-4596-9040-87d72ffca397';