-- Create RLS policies for prompts_modified table
-- All authenticated users can view prompts
CREATE POLICY "All authenticated users can view prompts" 
ON public.prompts_modified 
FOR SELECT 
USING (true);

-- Only super admins can create prompts
CREATE POLICY "Only super admins can create prompts" 
ON public.prompts_modified 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = 'super_admin'
));

-- Only super admins can update prompts
CREATE POLICY "Only super admins can update prompts" 
ON public.prompts_modified 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = 'super_admin'
));

-- Only super admins can delete prompts
CREATE POLICY "Only super admins can delete prompts" 
ON public.prompts_modified 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = 'super_admin'
));