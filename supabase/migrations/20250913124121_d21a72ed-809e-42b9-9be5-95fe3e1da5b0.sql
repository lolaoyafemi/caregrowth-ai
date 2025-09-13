-- Add page_number column to document_chunks table for accurate page tracking
ALTER TABLE public.document_chunks 
ADD COLUMN IF NOT EXISTS page_number INTEGER;