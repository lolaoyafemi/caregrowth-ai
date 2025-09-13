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
  embedding?: number[];
  chunk_index: number;
  similarity?: number;
  searchMethod?: string;
  matchedWords?: string[];
}

interface SmartSearchResult {
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

// Enhanced cosine similarity with validation
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    console.log('Invalid vectors for similarity calculation');
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (typeof a[i] !== 'number' || typeof b[i] !== 'number') {
      console.log('Non-numeric values in vectors');
      return 0;
    }
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    console.log('Zero magnitude vectors');
    return 0;
  }
  
  return dotProduct / magnitude;
}

// Generate embedding for search query
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    console.log(`Generating embedding for query: ${text.substring(0, 100)}...`);
    
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
    console.log('Successfully generated query embedding');
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Enhanced search with multiple strategies
async function findRelevantChunks(
  questionEmbedding: number[] | null, 
  chunks: DocumentChunk[], 
  question: string
): Promise<DocumentChunk[]> {
  if (!chunks || chunks.length === 0) {
    console.log('No chunks available for search');
    return [];
  }

  console.log(`Searching through ${chunks.length} chunks for relevant content`);

  // Strategy 1: Embedding-based similarity search (preferred)
  if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
    console.log('Using embedding-based similarity search');
    
    const chunksWithScores = chunks
      .filter(chunk => chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
      .map(chunk => {
        const similarity = cosineSimilarity(questionEmbedding, chunk.embedding!);
        console.log(`Chunk similarity: ${similarity.toFixed(4)} for content: "${chunk.content.substring(0, 100)}..." (Page ${chunk.page_number || 'N/A'})`);
        return {
          ...chunk,
          similarity,
          searchMethod: 'embedding'
        };
      })
      .sort((a, b) => b.similarity! - a.similarity!);

    if (chunksWithScores.length > 0) {
      const topScore = chunksWithScores[0].similarity!;
      const minThreshold = 0.15;
      const adaptiveThreshold = Math.max(minThreshold, topScore * 0.5);
      
      let relevantChunks = chunksWithScores.filter(chunk => chunk.similarity! > adaptiveThreshold);
      
      if (relevantChunks.length === 0 && chunksWithScores.length > 0) {
        relevantChunks = chunksWithScores.slice(0, 5);
        console.log(`No chunks above threshold, taking top 5 chunks`);
      } else {
        console.log(`Found ${relevantChunks.length} chunks above adaptive threshold ${adaptiveThreshold.toFixed(3)}`);
      }
      
      return relevantChunks.slice(0, 8); // Increased to 8 for better context
    }
  }

  // Strategy 2: Keyword-based search (fallback)
  console.log('Using keyword-based search as fallback');
  const questionWords = question.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 10);

  console.log('Searching for keywords:', questionWords);

  const keywordMatches = chunks
    .map(chunk => {
      const content = chunk.content.toLowerCase();
      const matches = questionWords.filter(word => content.includes(word));
      const score = matches.length / Math.max(questionWords.length, 1);
      
      return {
        ...chunk,
        similarity: score,
        searchMethod: 'keyword',
        matchedWords: matches
      };
    })
    .filter(chunk => chunk.similarity! > 0.1)
    .sort((a, b) => b.similarity! - a.similarity!)
    .slice(0, 8);

  if (keywordMatches.length > 0) {
    console.log(`Keyword search found ${keywordMatches.length} relevant chunks`);
    return keywordMatches;
  }

  // Strategy 3: If nothing else works, return first few chunks
  console.log('No relevant chunks found, returning first 3 chunks as fallback');
  return chunks.slice(0, 3).map(chunk => ({
    ...chunk,
    similarity: 0.1,
    searchMethod: 'fallback'
  }));
}

// Generate AI answer from relevant chunks
async function generateAnswer(question: string, relevantChunks: DocumentChunk[]): Promise<{ answer: string; tokensUsed?: number }> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Generating answer from ${relevantChunks.length} relevant chunks`);

  // Prepare context with page references
  let context = "Based on these document excerpts with exact page references:\n\n";
  
  const sources = new Map();
  
  relevantChunks.forEach((chunk, index) => {
    const pageRef = chunk.page_number ? ` (Page ${chunk.page_number})` : '';
    const source = `Source ${index + 1}${pageRef}: ${chunk.content}\n\n`;
    context += source;
    
    // Track document sources for later use
    if (!sources.has(chunk.document_id)) {
      sources.set(chunk.document_id, { page_numbers: new Set(), chunks: [] });
    }
    if (chunk.page_number) {
      sources.get(chunk.document_id).page_numbers.add(chunk.page_number);
    }
    sources.get(chunk.document_id).chunks.push(chunk);
  });

  const prompt = `${context}

Question: ${question}

Instructions: 
- Answer the question using ONLY the provided content above
- Always cite specific page numbers when available (e.g., "According to page 5...")  
- If information spans multiple pages, mention all relevant page numbers
- If the answer isn't in the provided content, say "I don't have information about this in the provided documents"
- Be specific and detailed in your response
- Quote relevant text when appropriate`;

  try {
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
            content: 'You are a helpful AI assistant that answers questions based on document content with accurate page references.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
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

    console.log(`Generated answer (${tokensUsed} tokens): ${answer.substring(0, 200)}...`);
    
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
    console.log('Starting enhanced document search request...');
    
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

    console.log('Processing enhanced search query for user:', authenticatedUserId);

    // Get user's documents from both personal and shared sources
    console.log('Fetching user documents and shared documents...');
    
    const [userDocsResponse, sharedDocsResponse] = await Promise.all([
      supabase
        .from('google_documents')
        .select('id, doc_title, doc_link')
        .eq('user_id', authenticatedUserId),
      supabase
        .from('shared_documents')
        .select('id, doc_title, file_name')
        .eq('processing_status', 'completed')
    ]);

    if (userDocsResponse.error) {
      console.error('Error fetching user documents:', userDocsResponse.error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user documents' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (sharedDocsResponse.error) {
      console.error('Error fetching shared documents:', sharedDocsResponse.error);
    }

    const userDocIds = (userDocsResponse.data || []).map(doc => doc.id);
    const sharedDocIds = (sharedDocsResponse.data || []).map(doc => doc.id);
    const allDocIds = [...userDocIds, ...sharedDocIds];

    console.log(`Found ${userDocIds.length} personal documents and ${sharedDocIds.length} shared documents`);

    if (allDocIds.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "I don't have access to any documents to search through. Please add some documents first.",
        sources: [],
        totalDocumentsSearched: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(query);

    // Fetch document chunks with page numbers
    console.log(`Fetching chunks from ${allDocIds.length} documents...`);
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, document_id, page_number, chunk_index, embedding')
      .in('document_id', allDocIds);

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
    console.log(`Retrieved ${documentChunks.length} chunks for search`);

    // Find relevant chunks using enhanced search
    const relevantChunks = await findRelevantChunks(questionEmbedding, documentChunks, query);
    console.log(`Found ${relevantChunks.length} relevant chunks`);

    if (relevantChunks.length === 0) {
      return new Response(JSON.stringify({
        answer: "I couldn't find any relevant information in the available documents to answer your question.",
        sources: [],
        totalDocumentsSearched: allDocIds.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI answer
    const { answer, tokensUsed } = await generateAnswer(query, relevantChunks);

    // Prepare sources with document information
    const documentMap = new Map();
    
    // Add user documents
    (userDocsResponse.data || []).forEach(doc => {
      documentMap.set(doc.id, { title: doc.doc_title || 'Untitled Document', url: doc.doc_link });
    });
    
    // Add shared documents  
    (sharedDocsResponse.data || []).forEach(doc => {
      documentMap.set(doc.id, { title: doc.doc_title || doc.file_name || 'Untitled Document', url: null });
    });

    const sources = relevantChunks
      .map(chunk => {
        const docInfo = documentMap.get(chunk.document_id);
        return {
          documentTitle: docInfo?.title || 'Unknown Document',
          documentUrl: docInfo?.url || '',
          relevantContent: chunk.content.substring(0, 300) + (chunk.content.length > 300 ? '...' : ''),
          pageNumber: chunk.page_number,
          confidence: chunk.similarity || 0
        };
      })
      .filter((source, index, self) => 
        index === self.findIndex(s => 
          s.documentTitle === source.documentTitle && s.pageNumber === source.pageNumber
        )
      )
      .slice(0, 5);

    console.log(`Enhanced search completed: ${sources.length} sources from ${allDocIds.length} documents`);

    return new Response(JSON.stringify({
      answer,
      sources,
      tokensUsed,
      totalDocumentsSearched: allDocIds.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-document-search-v2:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});