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
  section_path?: string;
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

// Generate embedding for search query using text-embedding-3-small for speed
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    console.log(`Generating optimized embedding for query: ${text.substring(0, 100)}...`);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Faster model for speed
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
    console.log('Successfully generated optimized embedding');
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Normalize text for better search
function normalizeText(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .trim();
}

// MMR (Maximal Marginal Relevance) for diversity
function applyMMR(chunks: DocumentChunk[], lambda: number = 0.7, maxResults: number = 12): DocumentChunk[] {
  if (chunks.length <= maxResults) return chunks;
  
  const selected: DocumentChunk[] = [];
  const remaining = [...chunks];
  
  // Select the highest scoring chunk first
  selected.push(remaining.shift()!);
  
  while (selected.length < maxResults && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevanceScore = candidate.similarity || 0;
      
      // Calculate diversity penalty (similarity to already selected chunks)
      let maxSimilarity = 0;
      for (const selectedChunk of selected) {
        if (candidate.embedding && selectedChunk.embedding) {
          const similarity = cosineSimilarity(candidate.embedding, selectedChunk.embedding);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }
      
      // MMR score: λ * relevance - (1-λ) * redundancy
      const mmrScore = lambda * relevanceScore - (1 - lambda) * maxSimilarity;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }
    
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  
  return selected;
}

// Fast search with optimized retrieval strategy
async function findRelevantChunks(
  questionEmbedding: number[] | null, 
  chunks: DocumentChunk[], 
  question: string,
  supabase: any,
  userDocIds: string[]
): Promise<DocumentChunk[]> {
  if (!chunks || chunks.length === 0) {
    console.log('No chunks available for search');
    return [];
  }

  console.log(`Starting optimized search through ${chunks.length} chunks`);
  const normalizedQuery = normalizeText(question);

  let results: DocumentChunk[] = [];

  // Strategy 1: Vector similarity (optimized for speed)
  if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
    console.log('Running optimized vector search...');
    
    const chunksWithEmbeddings = chunks.filter(chunk => 
      chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0
    );

    const vectorResults = chunksWithEmbeddings
      .map(chunk => {
        const similarity = cosineSimilarity(questionEmbedding, chunk.embedding!);
        return {
          ...chunk,
          similarity,
          searchMethod: 'vector'
        };
      })
      .filter(chunk => chunk.similarity! > 0.25) // Optimized threshold
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 10); // Limit for speed

    results = vectorResults;
    console.log(`Vector search found ${results.length} results`);
  }

  // Strategy 2: Fast text search fallback
  if (results.length < 8) {
    console.log('Running fast text search...');
    
    try {
      const { data: textResults, error } = await supabase
        .from('document_chunks')
        .select('content, document_id, page_number, chunk_index, embedding')
        .in('document_id', userDocIds)
        .textSearch('tsvector_content', normalizedQuery.split(' ').slice(0, 5).join(' | '))
        .limit(8);

      if (!error && textResults) {
        const textChunks = textResults
          .map((chunk: any) => ({
            ...chunk,
            similarity: 0.7, // High score for text matches
            searchMethod: 'text'
          }))
          .filter((chunk: any) => 
            !results.some(r => `${r.document_id}_${r.chunk_index}` === `${chunk.document_id}_${chunk.chunk_index}`)
          );
        
        results = [...results, ...textChunks].slice(0, 10);
        console.log(`Text search added ${textChunks.length} results`);
      }
    } catch (error) {
      console.log('Text search failed:', error);
    }
  }

  // Strategy 3: Keyword fallback (if still not enough results)
  if (results.length < 5) {
    console.log('Running keyword fallback...');
    const questionWords = normalizedQuery.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 8);

    const keywordMatches = chunks
      .map(chunk => {
        const content = normalizeText(chunk.content).toLowerCase();
        const matches = questionWords.filter(word => content.includes(word));
        const score = matches.length / Math.max(questionWords.length, 1);
        
        return {
          ...chunk,
          similarity: score,
          searchMethod: 'keyword'
        };
      })
      .filter(chunk => 
        chunk.similarity! > 0.2 && 
        !results.some(r => `${r.document_id}_${r.chunk_index}` === `${chunk.document_id}_${chunk.chunk_index}`)
      )
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 5);

    results = [...results, ...keywordMatches].slice(0, 10);
    console.log(`Keyword search added ${keywordMatches.length} results`);
  }

  console.log(`Optimized search completed: ${results.length} chunks found`);
  return results.slice(0, 8); // Final limit for speed
}

// Generate AI answer from relevant chunks with better context
async function generateAnswer(question: string, relevantChunks: DocumentChunk[]): Promise<{ answer: string; tokensUsed?: number }> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Generating answer from ${relevantChunks.length} relevant chunks using GPT-4o-mini`);

  // Group chunks by document and page for better context
  const contextByDoc = new Map<string, { title: string; chunks: DocumentChunk[] }>();
  
  relevantChunks.forEach(chunk => {
    if (!contextByDoc.has(chunk.document_id)) {
      contextByDoc.set(chunk.document_id, { title: '', chunks: [] });
    }
    contextByDoc.get(chunk.document_id)!.chunks.push(chunk);
  });

  // Prepare enhanced context with document structure
  let context = "Based on these document excerpts from your personal knowledge base:\n\n";
  
  let sourceIndex = 1;
  contextByDoc.forEach((docData, docId) => {
    const sortedChunks = docData.chunks.sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
    
    sortedChunks.forEach(chunk => {
      const pageRef = chunk.page_number ? ` (Page ${chunk.page_number})` : '';
      const sectionRef = chunk.section_path ? ` [${chunk.section_path}]` : '';
      const methodInfo = chunk.searchMethod ? ` [${chunk.searchMethod}, score: ${(chunk.similarity || 0).toFixed(3)}]` : '';
      
      context += `Source ${sourceIndex}${pageRef}${sectionRef}${methodInfo}:\n${chunk.content}\n\n`;
      sourceIndex++;
    });
  });

  const prompt = `${context}

Question: ${question}

Instructions for accurate answers:
- Answer ONLY using the provided document excerpts above
- ALWAYS cite specific page numbers when available (e.g., "According to page 5...")
- Quote relevant text directly when it answers the question
- If information spans multiple pages, mention all relevant page numbers
- If the answer requires information not in the provided excerpts, say "I don't have enough information in the provided documents to fully answer this question"
- Be specific, detailed, and accurate
- Highlight the exact phrases from the documents that support your answer
- If you find conflicting information, mention it and cite the sources`;

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
            content: 'You are a precise AI assistant that answers questions based strictly on provided document content. Always cite page numbers and quote directly from the source material. Never make assumptions or add information not explicitly stated in the documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600, // Optimized for speed and quality
        temperature: 0.2 // Balanced for accuracy and efficiency
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

    console.log(`Generated enhanced answer (${tokensUsed} tokens): ${answer.substring(0, 200)}...`);
    
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

    // Get user's personal documents only (no shared documents)
    console.log('Fetching user personal documents only...');
    
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
    console.log(`Found ${userDocIds.length} personal documents`);

    if (userDocIds.length === 0) {
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
    console.log(`Fetching chunks from ${userDocIds.length} documents...`);
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, document_id, page_number, chunk_index, embedding')
      .in('document_id', userDocIds);

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

    // Find relevant chunks using hybrid search
    const relevantChunks = await findRelevantChunks(questionEmbedding, documentChunks, query, supabase, userDocIds);
    console.log(`Found ${relevantChunks.length} relevant chunks`);

    if (relevantChunks.length === 0) {
      return new Response(JSON.stringify({
        answer: "No exact match found in your documents. This might be because the text uses different wording than your query, or the content hasn't been properly indexed yet.",
        sources: [],
        searchSuggestion: "Try rephrasing your query with different keywords or check if your documents have been fully processed.",
        totalDocumentsSearched: userDocIds.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI answer
    const { answer, tokensUsed } = await generateAnswer(query, relevantChunks);

    // Prepare sources with document information
    const documentMap = new Map();
    
    // Add user documents only
    (userDocsResponse.data || []).forEach(doc => {
      documentMap.set(doc.id, { title: doc.doc_title || 'Untitled Document', url: doc.doc_link });
    });

    const sources = relevantChunks
      .map((chunk, index) => {
        const docInfo = documentMap.get(chunk.document_id);
        return {
          documentTitle: docInfo?.title || 'Unknown Document',
          documentUrl: docInfo?.url || '',
          relevantContent: chunk.content.substring(0, 400) + (chunk.content.length > 400 ? '...' : ''),
          pageNumber: chunk.page_number,
          sectionPath: chunk.section_path,
          confidence: Math.round((chunk.similarity || 0) * 100) / 100,
          searchMethod: chunk.searchMethod,
          rank: index + 1
        };
      })
      .filter((source, index, self) => 
        index === self.findIndex(s => 
          s.documentTitle === source.documentTitle && 
          s.pageNumber === source.pageNumber &&
          s.relevantContent === source.relevantContent
        )
      )
      .slice(0, 8); // Show more sources for transparency

    console.log(`Enhanced hybrid search completed: ${sources.length} sources from ${userDocIds.length} documents`);

    return new Response(JSON.stringify({
      answer,
      sources,
      tokensUsed,
      totalDocumentsSearched: userDocIds.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-document-search-v2:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});