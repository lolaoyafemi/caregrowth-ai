-- Add new columns to training_scenarios
ALTER TABLE public.training_scenarios
ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN caller_persona text,
ADD COLUMN care_situation text,
ADD COLUMN primary_concern text,
ADD COLUMN common_mistakes text[],
ADD COLUMN emotional_tone text,
ADD COLUMN ai_system_prompt text,
ADD COLUMN evaluation_rubric jsonb;

-- Ensure RLS policies allow Super Admins to update status
CREATE POLICY "Super admins can manage training scenarios" 
ON public.training_scenarios 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'super_admin'));
