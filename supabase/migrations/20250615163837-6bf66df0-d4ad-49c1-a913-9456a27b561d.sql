
-- Add cascading deletion to the foreign key constraint
-- First, drop the existing foreign key constraint
ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

-- Add the foreign key constraint with CASCADE deletion
ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_document_id_fkey 
FOREIGN KEY (document_id) 
REFERENCES google_documents(id) 
ON DELETE CASCADE;
