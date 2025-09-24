import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { documentId, filePath, googleDriveId, accessToken } = await req.json();

    console.log(`Processing shared document: ${documentId}`);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    let content = '';

    // Get content from Google Drive if googleDriveId provided
    if (googleDriveId && accessToken) {
      console.log(`Fetching content from Google Drive: ${googleDriveId}`);
      
      try {
        // Try to export as plain text first (for Google Docs)
        const exportResponse = await fetch(
          `${GOOGLE_DRIVE_FILES_URL}/${googleDriveId}/export?mimeType=text/plain`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (exportResponse.ok) {
          content = await exportResponse.text();
        } else {
          // Fall back to direct download for other file types
          const downloadResponse = await fetch(
            `${GOOGLE_DRIVE_FILES_URL}/${googleDriveId}?alt=media`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (downloadResponse.ok) {
            if (document.mime_type === 'application/pdf') {
              // For PDFs, we would need a PDF text extraction library
              // For now, we'll just note that it needs processing
              content = '[PDF content - requires text extraction]';
            } else {
              content = await downloadResponse.text();
            }
          } else {
            throw new Error('Failed to download file content');
          }
        }
      } catch (fetchError) {
        console.error('Error fetching Google Drive content:', fetchError);
        throw new Error(`Failed to fetch content: ${(fetchError as Error).message}`);
      }
    }

    if (!content || content.trim().length === 0) {
      throw new Error('No content to process');
    }

    // Clean and prepare content
    const cleanContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    if (cleanContent.length < 10) {
      throw new Error('Content too short to process');
    }

    console.log(`Content extracted, length: ${cleanContent.length} characters`);

    // Chunk the content for embedding
    const chunks = chunkText(cleanContent, 1000, 200); // 1000 char chunks with 200 char overlap
    console.log(`Created ${chunks.length} chunks`);

    // Get OpenAI API key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Process each chunk and create embeddings
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        // Create embedding
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk.content,
          }),
        });

        if (!embeddingResponse.ok) {
          throw new Error(`Embedding API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Store chunk with embedding
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: documentId,
            chunk_index: index,
            content: chunk.content,
            page_number: chunk.page,
            is_shared: true,
            embedding: embedding,
          });

        if (chunkError) {
          console.error('Error storing chunk:', chunkError);
          throw chunkError;
        }

        return { success: true, index };
      } catch (error) {
        console.error(`Error processing chunk ${index}:`, error);
        return { success: false, index, error: (error as Error).message };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    const successfulChunks = chunkResults.filter(r => r.success).length;
    const failedChunks = chunkResults.filter(r => !r.success).length;

    console.log(`Processed ${successfulChunks} chunks successfully, ${failedChunks} failed`);

    // Update document status
    const processingStatus = failedChunks === 0 ? 'completed' : 
                           successfulChunks > 0 ? 'partial' : 'failed';

    await supabase
      .from('shared_documents')
      .update({
        processing_status: processingStatus,
        fetched: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    return new Response(JSON.stringify({
      success: true,
      document_id: documentId,
      chunks_processed: successfulChunks,
      chunks_failed: failedChunks,
      processing_status: processingStatus
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Document processing error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): Array<{content: string, page: number}> {
  const chunks: Array<{content: string, page: number}> = [];
  let start = 0;
  let pageNumber = 1;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > chunk.length * 0.7) { // Only break if we're not losing too much content
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    chunks.push({
      content: chunk.trim(),
      page: pageNumber
    });

    start = start + chunkSize - overlap;
    pageNumber++;
  }

  return chunks.filter(chunk => chunk.content.length > 10);
}