-- Create shared_folders table for folder sharing approach
CREATE TABLE public.shared_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  error_message TEXT,
  documents_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for shared folders
CREATE POLICY "Users can view their own shared folders" 
ON public.shared_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shared folders" 
ON public.shared_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared folders" 
ON public.shared_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared folders" 
ON public.shared_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_folders_updated_at
BEFORE UPDATE ON public.shared_folders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();