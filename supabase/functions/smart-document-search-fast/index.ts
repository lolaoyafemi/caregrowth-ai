import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

interface DocumentChunk {
  content: string;
  document_id: string;
  page_number?: number;
  chunk_index: number;
  similarity?: number;
}

interface SearchResult {
  answer: string;
  sources: Array<{
    documentTitle: string;
    documentUrl: string;
    relevantContent: string;
    pageNumber?: number;
    confidence: number;
  }>;
  tokensUsed?: number;
}

// Fast embedding generation using text-embedding-3-small for speed
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    console.log(`Generating fast embedding for query: ${text.substring(0, 100)}...`);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Faster, smaller model
        input: text,
        dimensions: 512 // Reduced dimensions for speed
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Successfully generated fast embedding');
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Fast search with simplified retrieval
async function findRelevantChunks(
  questionEmbedding: number[] | null, 
  chunks: DocumentChunk[], 
  question: string
): Promise<DocumentChunk[]> {
  console.log(`Fast search through ${chunks.length} chunks`);
  
  // Strategy 1: Vector similarity (if embedding available)
  let vectorResults: DocumentChunk[] = [];
  if (questionEmbedding && chunks.some(chunk => Array.isArray(chunk.embedding))) {
    console.log('Running fast vector search...');
    
    const chunksWithEmbeddings = chunks.filter(chunk => 
      chunk.embedding && Array.isArray(chunk.embedding)
    );

    vectorResults = chunksWithEmbeddings
      .map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(questionEmbedding, chunk.embedding!)
      }))
      .filter(chunk => chunk.similarity! > 0.3) // Higher threshold for speed
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 8); // Limit results for speed
  }
  
  // Strategy 2: Fast keyword search (fallback)
  if (vectorResults.length < 5) {
    console.log('Running fast keyword search...');
    const questionWords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit keywords

    const keywordResults = chunks
      .map(chunk => {
        const content = chunk.content.toLowerCase();
        const matches = questionWords.filter(word => content.includes(word));
        const score = matches.length / Math.max(questionWords.length, 1);
        
        return {
          ...chunk,
          similarity: score
        };
      })
      .filter(chunk => chunk.similarity! > 0.2)
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 6);
    
    // Merge results (remove duplicates)
    const seenIds = new Set(vectorResults.map(r => `${r.document_id}_${r.chunk_index}`));
    const uniqueKeywordResults = keywordResults.filter(r => 
      !seenIds.has(`${r.document_id}_${r.chunk_index}`)
    );
    
    vectorResults = [...vectorResults, ...uniqueKeywordResults].slice(0, 8);
  }
  
  console.log(`Fast search found ${vectorResults.length} relevant chunks`);
  return vectorResults;
}

// Fast answer generation
async function generateAnswer(question: string, relevantChunks: DocumentChunk[]): Promise<{ answer: string; tokensUsed?: number }> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Generating fast answer from ${relevantChunks.length} chunks`);

  // Build concise context
  const context = relevantChunks
    .map((chunk, index) => {
      const pageRef = chunk.page_number ? ` (Page ${chunk.page_number})` : '';
      return `Source ${index + 1}${pageRef}: ${chunk.content.substring(0, 300)}`;
    })
    .join('\n\n');

  const prompt = `Based on these document excerpts from your knowledge base:

${context}

Question: ${question}

Instructions:
- Answer directly using the provided documents
- Cite page numbers when available (e.g., "According to page 5...")
- Be concise but complete (150-250 words)
- If information is missing, state it clearly`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast model
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that answers questions based strictly on provided document content. Always cite sources and be concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400, // Reduced for speed
        temperature: 0.1 // Low for accuracy
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Chat API error:', response.status, errorText);
      throw new Error('Failed to generate answer');
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens;

    console.log(`Generated fast answer (${tokensUsed} tokens)`);
    
    return { answer, tokensUsed };
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error('Failed to generate AI answer');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting fast document search request...');
    
    // Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Missing or invalid authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authenticatedUserId = user.id;
    const requestBody = await req.json();
    const { query } = requestBody;
    
    if (!query) {
      return new Response(JSON.stringify({ 
        error: 'Query is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing fast search query for user:', authenticatedUserId);

    // Get user's documents
    const userDocsResponse = await supabase
      .from('google_documents')
      .select('id, doc_title, doc_link')
      .eq('user_id', authenticatedUserId);

    if (userDocsResponse.error) {
      console.error('Error fetching user documents:', userDocsResponse.error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user documents' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userDocIds = (userDocsResponse.data || []).map(doc => doc.id);
    console.log(`Found ${userDocIds.length} user documents`);

    if (userDocIds.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "I don't have access to any documents to search through. Please add some documents first.",
        sources: [],
        totalDocumentsSearched: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate embedding for the question (fast)
    const questionEmbedding = await generateEmbedding(query);

    // Fetch document chunks (limit for speed)
    console.log(`Fetching chunks from ${userDocIds.length} documents...`);
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, document_id, page_number, chunk_index, embedding')
      .in('document_id', userDocIds)
      .limit(200); // Limit for speed

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch document content' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const documentChunks = (chunks || []) as DocumentChunk[];
    console.log(`Retrieved ${documentChunks.length} chunks for fast search`);

    // Find relevant chunks using fast search
    const relevantChunks = await findRelevantChunks(questionEmbedding, documentChunks, query);
    console.log(`Found ${relevantChunks.length} relevant chunks`);

    if (relevantChunks.length === 0) {
      return new Response(JSON.stringify({
        answer: "No relevant information found in your documents for this query. Try rephrasing your question or check if your documents contain the information you're looking for.",
        sources: [],
        totalDocumentsSearched: userDocIds.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI answer
    const { answer, tokensUsed } = await generateAnswer(query, relevantChunks);

    // Prepare sources
    const documentMap = new Map();
    (userDocsResponse.data || []).forEach(doc => {
      documentMap.set(doc.id, { title: doc.doc_title || 'Untitled Document', url: doc.doc_link });
    });

    const sources = relevantChunks
      .map((chunk, index) => {
        const docInfo = documentMap.get(chunk.document_id);
        return {
          documentTitle: docInfo?.title || 'Unknown Document',
          documentUrl: docInfo?.url || '',
          relevantContent: chunk.content.substring(0, 250) + (chunk.content.length > 250 ? '...' : ''),
          pageNumber: chunk.page_number,
          confidence: Math.round((chunk.similarity || 0) * 100) / 100,
          rank: index + 1
        };
      })
      .slice(0, 5); // Limit sources for speed

    console.log(`Fast search completed: ${sources.length} sources from ${userDocIds.length} documents`);

    return new Response(JSON.stringify({
      answer,
      sources,
      tokensUsed,
      totalDocumentsSearched: userDocIds.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fast document search:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});