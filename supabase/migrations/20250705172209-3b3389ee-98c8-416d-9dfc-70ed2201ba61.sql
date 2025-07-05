
-- Create storage bucket for shared knowledge documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-knowledge',
  'shared-knowledge', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/csv']
);

-- Create policies for the shared knowledge bucket
CREATE POLICY "Super admins can upload shared documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shared-knowledge' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update shared documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shared-knowledge' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete shared documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shared-knowledge' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "All authenticated users can view shared documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'shared-knowledge' AND auth.role() = 'authenticated');

-- Create shared_documents table for admin-uploaded documents
CREATE TABLE public.shared_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  doc_title TEXT,
  document_category TEXT DEFAULT 'general',
  training_priority INTEGER DEFAULT 1,
  processing_status TEXT DEFAULT 'pending',
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fetched BOOLEAN NOT NULL DEFAULT false
);

-- Add RLS policies for shared documents
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage shared documents"
ON public.shared_documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "All authenticated users can view shared documents"
ON public.shared_documents FOR SELECT
USING (auth.role() = 'authenticated');

-- Add a column to document_chunks to identify shared vs user documents
ALTER TABLE public.document_chunks 
ADD COLUMN is_shared BOOLEAN DEFAULT false;

-- Add index for efficient shared document chunk queries
CREATE INDEX idx_document_chunks_shared 
ON public.document_chunks (is_shared, document_id) 
WHERE is_shared = true;

-- Add index for shared documents by category and status
CREATE INDEX idx_shared_documents_category_status 
ON public.shared_documents (document_category, processing_status, fetched);
