
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

// Intelligent content analysis and chunking using OpenAI
async function analyzeAndChunkContent(content: string, docTitle: string): Promise<string[]> {
  if (!openAIApiKey) {
    console.log('No OpenAI API key, falling back to basic chunking');
    return createBasicChunks(content, docTitle);
  }

  try {
    console.log('Analyzing content with OpenAI for intelligent chunking...');
    
    const analysisPrompt = `Analyze this document and create intelligent content chunks. Each chunk should be a coherent section that covers a specific topic or concept. Make each chunk self-contained and meaningful.

Document Title: "${docTitle}"

Document Content:
${content.substring(0, 8000)} ${content.length > 8000 ? '...(truncated for analysis)' : ''}

Instructions:
1. Identify the main topics and sections in this document
2. Create 3-8 chunks based on natural content divisions
3. Each chunk should be 200-800 words
4. Include relevant context in each chunk
5. Make chunks searchable and meaningful for Q&A

Return ONLY a JSON array of strings, where each string is a complete chunk with this format:
["Document: [title] - [section name]\n\n[chunk content]", "Document: [title] - [section name]\n\n[chunk content]", ...]

Respond with valid JSON only.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyzer. Create intelligent, coherent chunks from documents for knowledge management and Q&A systems. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.error('OpenAI analysis failed:', response.status, await response.text());
      return createBasicChunks(content, docTitle);
    }

    const analysisData = await response.json();
    const analysisResult = analysisData.choices[0].message.content;
    
    try {
      const intelligentChunks = JSON.parse(analysisResult);
      
      if (Array.isArray(intelligentChunks) && intelligentChunks.length > 0) {
        console.log(`Created ${intelligentChunks.length} intelligent chunks using OpenAI`);
        return intelligentChunks;
      } else {
        console.log('Invalid chunk format from OpenAI, falling back to basic chunking');
        return createBasicChunks(content, docTitle);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI chunking response:', parseError);
      return createBasicChunks(content, docTitle);
    }
  } catch (error) {
    console.error('Error in intelligent chunking:', error);
    return createBasicChunks(content, docTitle);
  }
}

// Fallback basic chunking function
function createBasicChunks(content: string, docTitle: string): string[] {
  const chunks = [];
  const maxChunkSize = 1000;
  
  // Clean and prepare content
  const cleanContent = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
  
  if (!cleanContent || cleanContent.length < 50) {
    console.log('Content too short or empty, skipping chunking');
    return [];
  }

  console.log(`Creating basic chunks from ${cleanContent.length} characters of content`);
  
  // If content is short enough, return as single chunk
  if (cleanContent.length <= maxChunkSize) {
    const enhancedContent = `Document: "${docTitle}"\n\n${cleanContent}`;
    chunks.push(enhancedContent);
    return chunks;
  }

  // Split by paragraphs first, then sentences
  const paragraphs = cleanContent.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  
  if (paragraphs.length === 0) {
    // Fall back to sentence splitting
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return createSentenceChunks(sentences, docTitle, maxChunkSize);
  }
  
  let currentChunk = `Document: "${docTitle}"\n\n`;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // If adding this paragraph would exceed max size, save current chunk
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 200) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.min(20, Math.floor(words.length / 3)));
      currentChunk = `Document: "${docTitle}" (continued)\n\n${overlapWords.join(' ')} `;
    }
    
    currentChunk += paragraph + '\n\n';
  }
  
  // Add the last chunk if it has meaningful content
  if (currentChunk.trim().length > 200) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`Created ${chunks.length} basic chunks from paragraphs`);
  return chunks;
}

function createSentenceChunks(sentences: string[], docTitle: string, maxChunkSize: number): string[] {
  const chunks = [];
  let currentChunk = `Document: "${docTitle}"\n\n`;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.';
    
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 200) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.min(15, Math.floor(words.length / 4)));
      currentChunk = `Document: "${docTitle}" (continued)\n\n${overlapWords.join(' ')} `;
    }
    
    currentChunk += sentence + ' ';
  }
  
  if (currentChunk.trim().length > 200) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`Created ${chunks.length} chunks from sentences`);
  return chunks;
}

// Enhanced content extraction with multiple format support
async function extractDocumentContent(docLink: string, docTitle: string): Promise<string> {
  console.log('Extracting content from:', docTitle);
  
  // Extract document ID from various Google document formats
  const docIdMatch = docLink.match(/\/document\/d\/([a-zA-Z0-9-_]+)/) || 
                    docLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) ||
                    docLink.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
  
  if (!docIdMatch) {
    console.log('Could not extract document ID from URL:', docLink);
    return '';
  }
  
  const docId = docIdMatch[1];
  console.log('Extracted document ID:', docId);
  
  // Try different export formats based on document type
  const exportUrls = [];
  
  if (docLink.includes('/document/')) {
    exportUrls.push(`https://docs.google.com/document/d/${docId}/export?format=txt`);
    exportUrls.push(`https://docs.google.com/document/d/${docId}/export?format=html`);
  } else if (docLink.includes('/spreadsheets/')) {
    exportUrls.push(`https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`);
    exportUrls.push(`https://docs.google.com/spreadsheets/d/${docId}/export?format=html`);
  } else if (docLink.includes('/presentation/')) {
    exportUrls.push(`https://docs.google.com/presentation/d/${docId}/export?format=txt`);
    exportUrls.push(`https://docs.google.com/presentation/d/${docId}/export?format=html`);
  }
  
  // Try each export URL
  for (const exportUrl of exportUrls) {
    try {
      console.log('Trying export URL:', exportUrl);
      const response = await fetch(exportUrl);
      
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        let content = await response.text();
        
        // Clean HTML content if needed
        if (exportUrl.includes('format=html')) {
          content = content
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Clean CSV content for spreadsheets
        if (exportUrl.includes('format=csv')) {
          content = content
            .split('\n')
            .map(line => line.replace(/,/g, ' '))
            .join('\n')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        if (content && content.length > 50) {
          console.log(`Successfully extracted ${content.length} characters from ${exportUrl}`);
          return content;
        } else {
          console.log(`Content too short (${content.length} chars) from ${exportUrl}`);
        }
      } else {
        console.log(`Failed to fetch from ${exportUrl}, status: ${response.status}`);
      }
    } catch (error) {
      console.log(`Error fetching from ${exportUrl}:`, error.message);
    }
  }
  
  console.log('Failed to extract any meaningful content from document');
  return '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, docLink, docTitle } = await req.json();
    
    if (!documentId || !docLink) {
      throw new Error('Document ID and link are required');
    }

    console.log('Processing document:', documentId, docTitle);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract content from the document
    const content = await extractDocumentContent(docLink, docTitle || 'Document');
    
    if (!content || content.length < 50) {
      console.log('No meaningful content extracted, failing the processing');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Could not extract meaningful content from the document. Please check if the document is publicly accessible.',
        chunksCreated: 0,
        chunksFailed: 0,
        totalChunks: 0,
        documentId,
        contentLength: content.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Extracted content length:', content.length);

    // Create intelligent chunks using OpenA1 analysis
    const chunks = await analyzeAndChunkContent(content, docTitle || 'Document');
    
    if (chunks.length === 0) {
      console.log('No chunks created from content');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Could not create meaningful chunks from the document content.',
        chunksCreated: 0,
        chunksFailed: 0,
        totalChunks: 0,
        documentId,
        contentLength: content.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created ${chunks.length} intelligent chunks`);

    // Clear existing chunks for this document
    const { error: deleteError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) {
      console.error('Error deleting existing chunks:', deleteError);
    }

    // Process each chunk and create embeddings
    let successfulChunks = 0;
    let failedChunks = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`Creating embedding for chunk ${i + 1}/${chunks.length}, length: ${chunk.length}`);
        
        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`Embedding API error for chunk ${i}:`, embeddingResponse.status, errorText);
          failedChunks++;
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;
        console.log(`Generated embedding for chunk ${i}, vector length: ${embedding.length}`);

        // Store chunk with embedding in database
        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: documentId,
            content: chunk,
            chunk_index: i,
            embedding: embedding
          });

        if (insertError) {
          console.error(`Error inserting chunk ${i}:`, insertError);
          failedChunks++;
        } else {
          successfulChunks++;
          console.log(`Successfully stored chunk ${i + 1}`);
        }
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        failedChunks++;
      }
    }

    // Update document status if chunks were created successfully
    if (successfulChunks > 0) {
      const { error: updateError } = await supabase
        .from('google_documents')
        .update({ fetched: true })
        .eq('id', documentId);

      if (updateError) {
        console.error('Error updating document status:', updateError);
      } else {
        console.log('Document marked as processed');
      }
    }

    console.log('Document processing completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      chunksCreated: successfulChunks,
      chunksFailed: failedChunks,
      totalChunks: chunks.length,
      documentId,
      contentLength: content.length,
      intelligentChunking: openAIApiKey ? true : false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-document function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing the document'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
