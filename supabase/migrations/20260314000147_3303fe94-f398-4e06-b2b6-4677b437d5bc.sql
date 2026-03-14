ALTER TABLE public.agency_profiles 
ADD COLUMN IF NOT EXISTS posting_workflow_mode text NOT NULL DEFAULT 'auto_post' 
CHECK (posting_workflow_mode IN ('auto_post', 'approve_before_posting'));