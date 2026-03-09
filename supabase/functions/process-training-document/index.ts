import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple PDF text extraction (extracts readable text from PDF)
function extractTextFromPDF(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Extract text between BT (begin text) and ET (end text) markers
  const textBlocks: string[] = [];
  let content = '';
  
  // Try to find stream content and extract readable text
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
  let match;
  
  while ((match = streamRegex.exec(text)) !== null) {
    const streamContent = match[1];
    // Extract text objects from the stream
    const textObjRegex = /\(([^)]*)\)/g;
    let textMatch;
    while ((textMatch = textObjRegex.exec(streamContent)) !== null) {
      const extractedText = textMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (extractedText.trim()) {
        textBlocks.push(extractedText);
      }
    }
  }
  
  if (textBlocks.length > 0) {
    content = textBlocks.join(' ');
  }
  
  // Fallback: extract any readable ASCII sequences
  if (!content.trim()) {
    const readableChars: string[] = [];
    let currentWord = '';
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Check if byte is printable ASCII
      if (byte >= 32 && byte <= 126) {
        currentWord += String.fromCharCode(byte);
      } else if (currentWord.length > 3) {
        // Only keep words longer than 3 chars
        readableChars.push(currentWord);
        currentWord = '';
      } else {
        currentWord = '';
      }
    }
    
    if (currentWord.length > 3) {
      readableChars.push(currentWord);
    }
    
    content = readableChars.join(' ');
  }
  
  // Clean up the content
  return content
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
}

// Simple DOCX text extraction
async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  // DOCX files are ZIP archives containing XML
  // We'll look for the document.xml content
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Extract text from XML-like content
  const textContent: string[] = [];
  
  // Look for <w:t> tags which contain text in DOCX
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/gi;
  let match;
  
  while ((match = textRegex.exec(text)) !== null) {
    if (match[1].trim()) {
      textContent.push(match[1]);
    }
  }
  
  // If we found XML text content
  if (textContent.length > 0) {
    return textContent.join(' ').replace(/\s+/g, ' ').trim();
  }
  
  // Fallback: try to extract readable content
  const readableContent = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
  
  return readableContent;
}

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): Array<{content: string, index: number}> {
  const chunks: Array<{content: string, index: number}> = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastQuestion = chunk.lastIndexOf('?');
      const breakPoint = Math.max(lastPeriod, lastNewline, lastQuestion);
      
      if (breakPoint > chunk.length * 0.6) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 20) {
      chunks.push({
        content: trimmedChunk,
        index: index
      });
      index++;
    }

    start = start + chunkSize - overlap;
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { documentId, filePath, category } = await req.json();

    console.log(`Processing training document: ${documentId}`);
    console.log(`File path: ${filePath}`);
    console.log(`Category: ${category}`);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('shared_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('shared-knowledge')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      throw new Error('Failed to download file from storage');
    }

    console.log(`File downloaded, size: ${fileData.size} bytes`);

    // Extract text based on file type
    let content = '';
    const fileName = document.file_name.toLowerCase();
    const mimeType = document.mime_type || '';

    if (fileName.endsWith('.txt') || mimeType === 'text/plain') {
      // Plain text file
      content = await fileData.text();
      console.log('Extracted text from TXT file');
    } else if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      // PDF file
      const buffer = await fileData.arrayBuffer();
      content = extractTextFromPDF(buffer);
      console.log('Extracted text from PDF file');
    } else if (fileName.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
      // DOCX file
      const buffer = await fileData.arrayBuffer();
      content = await extractTextFromDOCX(buffer);
      console.log('Extracted text from DOCX file');
    } else if (fileName.endsWith('.doc')) {
      // Old DOC format - try basic extraction
      const buffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      content = text.replace(/[^\\x20-\\x7E\\n]/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('Attempted text extraction from DOC file');
    }

    // Clean up content
    content = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    if (content.length < 50) {
      console.error('Insufficient content extracted:', content.length, 'characters');
      
      await supabase
        .from('shared_documents')
        .update({
          processing_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      return new Response(JSON.stringify({
        success: false,
        error: 'Could not extract sufficient text from document. Please ensure the file contains readable text.'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Content extracted, length: ${content.length} characters`);

    // Delete existing chunks for this document
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // Chunk the content
    const chunks = chunkText(content, 800, 150);
    console.log(`Created ${chunks.length} chunks`);

    // Get OpenAI API key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Process chunks and create embeddings
    let successCount = 0;
    let errorCount = 0;

    for (const chunk of chunks) {
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
          const errorText = await embeddingResponse.text();
          console.error(`Embedding API error for chunk ${chunk.index}:`, errorText);
          errorCount++;
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Store chunk with embedding and category
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: documentId,
            chunk_index: chunk.index,
            content: chunk.content,
            is_shared: true,
            embedding: embedding,
            section_path: category, // Store category in section_path for filtering
          });

        if (chunkError) {
          console.error('Error storing chunk:', chunkError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing chunk ${chunk.index}:`, error);
        errorCount++;
      }
    }

    console.log(`Processed ${successCount} chunks successfully, ${errorCount} failed`);

    // Update document status
    const processingStatus = errorCount === 0 ? 'completed' : 
                           successCount > 0 ? 'partial' : 'failed';

    await supabase
      .from('shared_documents')
      .update({
        processing_status: processingStatus,
        fetched: true,
        doc_title: document.doc_title || document.file_name.replace(/\.[^/.]+$/, ''),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    return new Response(JSON.stringify({
      success: true,
      document_id: documentId,
      category: category,
      content_length: content.length,
      chunks_processed: successCount,
      chunks_failed: errorCount,
      processing_status: processingStatus
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Training document processing error:", error);
    
    // Try to update document status to error
    try {
      const { documentId } = await req.clone().json();
      if (documentId) {
        await supabase
          .from('shared_documents')
          .update({ processing_status: 'error' })
          .eq('id', documentId);
      }
    } catch (e) {
      console.error('Failed to update error status:', e);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
