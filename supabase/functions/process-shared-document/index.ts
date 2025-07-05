
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface DocumentChunk {
  content: string;
  chunk_index: number;
  embedding?: number[];
}

async function extractTextFromFile(fileBuffer: ArrayBuffer, mimeType: string, fileName: string): Promise<string> {
  console.log(`Extracting text from ${fileName} (${mimeType})`);
  
  if (mimeType === 'text/plain' || mimeType === 'text/csv') {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(fileBuffer);
  }
  
  // For other file types, we'll return a basic extraction
  // In a production environment, you might want to use specialized libraries
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(fileBuffer);
  
  // Basic cleanup for common file formats
  return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
}

function chunkText(text: string, maxChunkSize: number = 1000): DocumentChunk[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunk_index: chunkIndex++
      });
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunk_index: chunkIndex
    });
  }

  return chunks.filter(chunk => chunk.content.length > 50);
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing shared document request...');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { documentId, filePath } = requestBody;
    console.log('Request data:', { documentId, filePath });
    
    if (!documentId || !filePath) {
      console.error('Missing required parameters:', { documentId, filePath });
      return new Response(JSON.stringify({ 
        error: 'Document ID and file path are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document details
    console.log('Fetching document details...');
    const { data: document, error: docError } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Error fetching document:', docError);
      return new Response(JSON.stringify({ 
        error: 'Document not found',
        details: docError.message
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!document) {
      console.error('Document not found');
      return new Response(JSON.stringify({ 
        error: 'Document not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Document found:', document.file_name);

    // Update processing status
    console.log('Updating processing status...');
    await supabase
      .from('shared_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Download file from storage
    console.log('Downloading file from storage...');
    const { data: fileData, error: fileError } = await supabase.storage
      .from('shared-knowledge')
      .download(filePath);

    if (fileError) {
      console.error('Error downloading file:', fileError);
      await supabase
        .from('shared_documents')
        .update({ processing_status: 'error' })
        .eq('id', documentId);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to download file',
        details: fileError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fileData) {
      console.error('No file data received');
      await supabase
        .from('shared_documents')
        .update({ processing_status: 'error' })
        .eq('id', documentId);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to download file - no data received' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File downloaded successfully');

    // Extract text content
    console.log('Extracting text content...');
    const fileBuffer = await fileData.arrayBuffer();
    const extractedText = await extractTextFromFile(fileBuffer, document.mime_type || 'text/plain', document.file_name);
    
    if (!extractedText || extractedText.length < 100) {
      console.error('Insufficient text content extracted:', extractedText?.length || 0);
      await supabase
        .from('shared_documents')
        .update({ processing_status: 'error' })
        .eq('id', documentId);
      
      return new Response(JSON.stringify({ 
        error: 'Insufficient text content extracted from document',
        extractedLength: extractedText?.length || 0
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Extracted ${extractedText.length} characters from ${document.file_name}`);

    // Create chunks
    console.log('Creating text chunks...');
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.error('No valid chunks created');
      await supabase
        .from('shared_documents')
        .update({ processing_status: 'error' })
        .eq('id', documentId);
      
      return new Response(JSON.stringify({ 
        error: 'No valid chunks could be created from document' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate embeddings and store chunks
    console.log('Processing chunks and generating embeddings...');
    let successfulChunks = 0;
    let embeddingErrors = 0;

    for (const chunk of chunks) {
      console.log(`Processing chunk ${chunk.chunk_index + 1}/${chunks.length}`);
      
      const embedding = await generateEmbedding(chunk.content);
      if (!embedding) {
        embeddingErrors++;
        console.warn(`Failed to generate embedding for chunk ${chunk.chunk_index}`);
      }
      
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          content: chunk.content,
          chunk_index: chunk.chunk_index,
          embedding: embedding,
          is_shared: true
        });

      if (chunkError) {
        console.error('Error inserting chunk:', chunkError);
      } else {
        successfulChunks++;
      }
    }

    console.log(`Processed chunks: ${successfulChunks}/${chunks.length} successful, ${embeddingErrors} embedding errors`);

    // Update document status
    const finalStatus = successfulChunks > 0 ? 'completed' : 'error';
    await supabase
      .from('shared_documents')
      .update({ 
        processing_status: finalStatus,
        fetched: finalStatus === 'completed',
        doc_title: document.doc_title || document.file_name
      })
      .eq('id', documentId);

    console.log(`Processing completed with status: ${finalStatus}`);

    return new Response(JSON.stringify({ 
      success: true,
      chunksProcessed: successfulChunks,
      totalChunks: chunks.length,
      textLength: extractedText.length,
      embeddingErrors: embeddingErrors,
      status: finalStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error processing shared document:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred processing the document',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
