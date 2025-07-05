
-- First, drop the existing foreign key constraint
ALTER TABLE public.document_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

-- We need to allow document_chunks to reference both google_documents and shared_documents
-- Since we can't have a foreign key that references multiple tables, we'll remove the constraint
-- and rely on application-level validation instead

-- Add an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Update RLS policies to handle both Google documents and shared documents
DROP POLICY IF EXISTS "Allow agency to read their document chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Allow agency to insert document chunks" ON public.document_chunks;

-- Create new policies that handle both document types
CREATE POLICY "Users can read their own document chunks" ON public.document_chunks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM google_documents 
    WHERE google_documents.id = document_chunks.document_id 
    AND google_documents.user_id = auth.uid()
  )
  OR 
  (is_shared = true AND auth.role() = 'authenticated')
);

CREATE POLICY "Users can insert their own document chunks" ON public.document_chunks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM google_documents 
    WHERE google_documents.id = document_chunks.document_id 
    AND google_documents.user_id = auth.uid()
  )
  OR 
  (is_shared = true AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  ))
);

-- Allow system to insert shared document chunks
CREATE POLICY "System can insert shared document chunks" ON public.document_chunks
FOR INSERT WITH CHECK (is_shared = true);
