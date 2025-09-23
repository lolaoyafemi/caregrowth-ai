-- Create documents table for full raw text storage
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_doc_id UUID REFERENCES public.google_documents(id) ON DELETE CASCADE,
  shared_doc_id UUID REFERENCES public.shared_documents(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  title TEXT,
  total_pages INTEGER,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT documents_source_check CHECK (
    (google_doc_id IS NOT NULL AND shared_doc_id IS NULL) OR
    (google_doc_id IS NULL AND shared_doc_id IS NOT NULL)
  )
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "Users can view their own documents" ON public.documents
FOR SELECT USING (
  (google_doc_id IN (SELECT id FROM public.google_documents WHERE user_id = auth.uid())) OR
  (shared_doc_id IN (SELECT id FROM public.shared_documents WHERE auth.role() = 'authenticated'))
);

CREATE POLICY "System can manage documents" ON public.documents
FOR ALL USING (auth.role() = 'service_role');

-- Enhance document_chunks table
ALTER TABLE public.document_chunks 
ADD COLUMN IF NOT EXISTS section_path TEXT,
ADD COLUMN IF NOT EXISTS token_count INTEGER,
ADD COLUMN IF NOT EXISTS tsvector_content TSVECTOR,
ADD COLUMN IF NOT EXISTS chunk_overlap_start INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chunk_overlap_end INTEGER DEFAULT 0;

-- Create better indexes for document_chunks
DROP INDEX IF EXISTS idx_document_chunks_embedding;
CREATE INDEX idx_document_chunks_embedding_ivfflat ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create GIN index for full-text search
CREATE INDEX idx_document_chunks_tsvector ON public.document_chunks 
USING GIN (tsvector_content);

-- Create index for faster document lookups
CREATE INDEX idx_document_chunks_document_id ON public.document_chunks (document_id);
CREATE INDEX idx_document_chunks_page_number ON public.document_chunks (page_number);

-- Create golden_tests table for evaluation
CREATE TABLE IF NOT EXISTS public.golden_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  expected_doc_id UUID,
  expected_substring TEXT NOT NULL,
  expected_page_number INTEGER,
  test_category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_tested_at TIMESTAMPTZ,
  last_success BOOLEAN,
  notes TEXT
);

-- Enable RLS on golden_tests
ALTER TABLE public.golden_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies for golden_tests
CREATE POLICY "Super admins can manage golden tests" ON public.golden_tests
FOR ALL USING (is_current_user_super_admin());

-- Create search_quality_metrics table
CREATE TABLE IF NOT EXISTS public.search_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_date TIMESTAMPTZ DEFAULT now(),
  total_tests INTEGER NOT NULL,
  successful_tests INTEGER NOT NULL,
  recall_at_10 DECIMAL(5,4),
  average_relevance_score DECIMAL(5,4),
  test_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on search_quality_metrics
ALTER TABLE public.search_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for search_quality_metrics
CREATE POLICY "Super admins can view search metrics" ON public.search_quality_metrics
FOR SELECT USING (is_current_user_super_admin());

CREATE POLICY "System can insert search metrics" ON public.search_quality_metrics
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Function to update tsvector automatically
CREATE OR REPLACE FUNCTION update_chunk_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsvector_content := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tsvector
DROP TRIGGER IF EXISTS trigger_update_chunk_tsvector ON public.document_chunks;
CREATE TRIGGER trigger_update_chunk_tsvector
  BEFORE INSERT OR UPDATE OF content ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_chunk_tsvector();

-- Update existing chunks to have tsvector
UPDATE public.document_chunks 
SET tsvector_content = to_tsvector('english', COALESCE(content, ''))
WHERE tsvector_content IS NULL;