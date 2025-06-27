
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to extract document title from content
function extractDocumentTitle(content: string): string | null {
  // Try to find title patterns in the content
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) return null;
  
  // The first non-empty line is usually the title
  const firstLine = lines[0].trim();
  
  // Skip if it's too long (likely not a title) or too short
  if (firstLine.length > 100 || firstLine.length < 3) {
    return null;
  }
  
  // Skip if it looks like a URL or contains special characters that suggest it's not a title
  if (firstLine.includes('http') || firstLine.includes('www.') || firstLine.includes('@')) {
    return null;
  }
  
  return firstLine;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, content } = await req.json();

    if (!documentId || !content) {
      return new Response(
        JSON.stringify({ error: 'Document ID and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing document:', documentId);
    console.log('Content length:', content.length);

    // Extract title from document content
    const extractedTitle = extractDocumentTitle(content);
    console.log('Extracted title:', extractedTitle);

    // Update document with extracted title if we found one
    if (extractedTitle) {
      const { error: updateError } = await supabaseClient
        .from('google_documents')
        .update({ doc_title: extractedTitle })
        .eq('id', documentId);

      if (updateError) {
        console.error('Error updating document title:', updateError);
      } else {
        console.log('Document title updated:', extractedTitle);
      }
    }

    // Process the document content into chunks for search
    const chunks = [];
    const chunkSize = 1000;
    const words = content.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        document_id: documentId,
        content: chunk,
        chunk_index: Math.floor(i / chunkSize)
      });
    }

    console.log('Created chunks:', chunks.length);

    // Save chunks to database
    if (chunks.length > 0) {
      const { error: chunksError } = await supabaseClient
        .from('document_chunks')
        .insert(chunks);

      if (chunksError) {
        console.error('Error saving document chunks:', chunksError);
        throw chunksError;
      }
    }

    // Mark document as processed
    const { error: updateError } = await supabaseClient
      .from('google_documents')
      .update({ fetched: true })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error marking document as processed:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: chunks.length,
        titleExtracted: extractedTitle 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
