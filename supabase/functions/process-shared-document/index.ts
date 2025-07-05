
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check environment variables at startup
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

console.log('=== Environment Check ===');
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
console.log('OPENAI_API_KEY:', openAIApiKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing required environment variables');
}

interface DocumentChunk {
  content: string;
  chunk_index: number;
  embedding?: number[];
}

async function extractTextFromFile(fileBuffer: ArrayBuffer, mimeType: string, fileName: string): Promise<string> {
  console.log(`Extracting text from ${fileName} (${mimeType})`);
  
  try {
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
  } catch (error) {
    console.error('Error in text extraction:', error);
    throw new Error(`Failed to extract text from ${fileName}: ${error.message}`);
  }
}

function chunkText(text: string, maxChunkSize: number = 1000): DocumentChunk[] {
  try {
    console.log(`Starting text chunking for text of length: ${text.length}`);
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    console.log(`Split into ${sentences.length} sentences`);
    
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

    const filteredChunks = chunks.filter(chunk => chunk.content.length > 50);
    console.log(`Created ${filteredChunks.length} valid chunks (minimum 50 chars each)`);
    
    return filteredChunks;
  } catch (error) {
    console.error('Error in text chunking:', error);
    throw new Error(`Failed to chunk text: ${error.message}`);
  }
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) {
    console.warn('OpenAI API key not configured - skipping embedding generation');
    return null;
  }

  try {
    console.log(`Generating embedding for text of length: ${text.length}`);
    
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
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Successfully generated embedding');
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

serve(async (req) => {
  console.log('=== NEW REQUEST RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting document processing ===');
    
    // Validate environment variables first
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error - missing Supabase config',
        details: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body length:', bodyText.length);
      
      if (!bodyText) {
        console.error('Empty request body');
        return new Response(JSON.stringify({ 
          error: 'Empty request body' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Request body parsed successfully:', { 
        documentId: requestBody.documentId, 
        filePath: requestBody.filePath 
      });
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: error.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { documentId, filePath } = requestBody;
    
    if (!documentId || !filePath) {
      console.error('Missing required parameters:', { documentId, filePath });
      return new Response(JSON.stringify({ 
        error: 'Document ID and file path are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document details
    console.log('Fetching document details for ID:', documentId);
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
      console.error('Document not found in database');
      return new Response(JSON.stringify({ 
        error: 'Document not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Document found:', document.file_name, 'Status:', document.processing_status);

    // Update processing status
    console.log('Updating processing status to "processing"...');
    const { error: updateError } = await supabase
      .from('shared_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating processing status:', updateError);
    }

    // Download file from storage
    console.log('Downloading file from storage:', filePath);
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
      console.error('No file data received from storage');
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

    console.log('File downloaded successfully, size:', fileData.size);

    // Extract text content
    console.log('=== Starting text extraction ===');
    const fileBuffer = await fileData.arrayBuffer();
    console.log('File buffer size:', fileBuffer.byteLength);
    
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

    console.log(`Successfully extracted ${extractedText.length} characters from ${document.file_name}`);

    // Create chunks
    console.log('=== Starting text chunking ===');
    const chunks = chunkText(extractedText);

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
    console.log('=== Processing chunks and generating embeddings ===');
    let successfulChunks = 0;
    let embeddingErrors = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.content.length} chars)`);
      
      let embedding = null;
      try {
        embedding = await generateEmbedding(chunk.content);
        if (!embedding) {
          embeddingErrors++;
          console.warn(`Failed to generate embedding for chunk ${chunk.chunk_index}`);
        }
      } catch (error) {
        embeddingErrors++;
        console.error(`Error generating embedding for chunk ${chunk.chunk_index}:`, error);
      }
      
      try {
        console.log(`Inserting chunk ${chunk.chunk_index} into database...`);
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
          console.log(`Successfully inserted chunk ${chunk.chunk_index}`);
        }
      } catch (error) {
        console.error(`Error inserting chunk ${chunk.chunk_index}:`, error);
      }
    }

    console.log(`=== Processing completed ===`);
    console.log(`Successful chunks: ${successfulChunks}/${chunks.length}`);
    console.log(`Embedding errors: ${embeddingErrors}`);

    // Update document status
    const finalStatus = successfulChunks > 0 ? 'completed' : 'error';
    console.log(`Setting final status to: ${finalStatus}`);
    
    const { error: finalUpdateError } = await supabase
      .from('shared_documents')
      .update({ 
        processing_status: finalStatus,
        fetched: finalStatus === 'completed',
        doc_title: document.doc_title || document.file_name
      })
      .eq('id', documentId);

    if (finalUpdateError) {
      console.error('Error updating final document status:', finalUpdateError);
    }

    console.log(`=== Document processing completed successfully ===`);

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
    console.error('=== CRITICAL ERROR in document processing ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred processing the document',
      details: error.message,
      type: error.constructor.name
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
