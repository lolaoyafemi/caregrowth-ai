
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { DocumentChunk } from './types.ts';

export class DatabaseService {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getUserDocuments(userId: string) {
    const { data: userDocs, error: docsError } = await this.supabase
      .from('google_documents')
      .select('id, doc_title')
      .eq('user_id', userId)
      .eq('fetched', true);

    if (docsError) {
      console.error('Error fetching user documents:', docsError);
      return [];
    }

    return userDocs || [];
  }

  async getDocumentChunks(documentIds: string[]): Promise<DocumentChunk[]> {
    if (documentIds.length === 0) return [];

    const { data: chunksData, error: chunksError } = await this.supabase
      .from('document_chunks')
      .select('content, document_id, embedding, chunk_index')
      .in('document_id', documentIds);

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError);
      return [];
    }

    return chunksData || [];
  }

  async logQAInteraction(userId: string, question: string, answer: string, category: string, sources: string[]) {
    try {
      const { error: logError } = await this.supabase
        .from('qna_logs')
        .insert({
          agency_id: userId,
          question: question,
          response: answer,
          category: category,
          sources: sources
        });

      if (logError) {
        console.error('Error logging Q&A:', logError);
      }
    } catch (error) {
      console.error('Error logging Q&A interaction:', error);
    }
  }
}
