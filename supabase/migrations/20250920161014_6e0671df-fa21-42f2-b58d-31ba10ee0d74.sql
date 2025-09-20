-- Allow users to create their own agency so Google connections can be stored
-- This follows existing agencies table RLS where users can select/update their own agency

-- Create INSERT policy for agencies
CREATE POLICY "Users can create their own agency"
ON public.agencies
FOR INSERT
WITH CHECK (admin_user_id = auth.uid());
