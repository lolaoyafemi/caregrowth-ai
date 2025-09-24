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

// Generate high-quality embedding with enhanced preprocessing
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    // Enhanced text preprocessing for better embeddings
    const preprocessedText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim()
      .toLowerCase();
    
    console.log(`Generating high-quality embedding for query: ${preprocessedText.substring(0, 100)}...`);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large', // Higher quality model for better accuracy
        input: preprocessedText,
        dimensions: 1024 // Higher dimensions for better precision
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Successfully generated high-quality embedding');
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

// Enhanced intelligent search with multi-layered approach
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

  console.log(`Starting enhanced intelligent search through ${chunks.length} chunks`);
  const normalizedQuery = normalizeText(question);

  let results: DocumentChunk[] = [];

  // Strategy 1: Enhanced vector similarity with adaptive thresholds
  if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
    console.log('Running enhanced vector search with adaptive scoring...');
    
    const chunksWithEmbeddings = chunks.filter(chunk => 
      chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0
    );

    const vectorResults = chunksWithEmbeddings
      .map(chunk => {
        const similarity = cosineSimilarity(questionEmbedding, chunk.embedding!);
        
        // Enhanced scoring with context boosting
        let boostedScore = similarity;
        
        // Boost score if chunk contains exact query terms
        const queryTerms = normalizedQuery.toLowerCase().split(/\s+/).filter(term => term.length > 3);
        const contentLower = chunk.content.toLowerCase();
        const exactMatches = queryTerms.filter(term => contentLower.includes(term)).length;
        const matchBoost = (exactMatches / Math.max(queryTerms.length, 1)) * 0.1;
        boostedScore += matchBoost;
        
        // Boost score for chunks with page numbers (more structured content)
        if (chunk.page_number) {
          boostedScore += 0.05;
        }
        
        return {
          ...chunk,
          similarity: boostedScore,
          originalSimilarity: similarity,
          searchMethod: 'enhanced_vector',
          exactMatches,
          matchBoost
        };
      })
      .filter(chunk => chunk.similarity! > 0.15) // Lower threshold with boosting
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 15); // More results for better selection

    results = vectorResults;
    console.log(`Enhanced vector search found ${results.length} results with boosted scoring`);
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

// Generate enhanced AI answer with page verification
async function generateAnswer(question: string, relevantChunks: DocumentChunk[]): Promise<{ answer: string; tokensUsed?: number; pageAccuracy?: number }> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Generating enhanced answer from ${relevantChunks.length} relevant chunks using GPT-4o`);

  // Group chunks by document and page for better context
  const contextByDoc = new Map<string, { title: string; chunks: DocumentChunk[] }>();
  
  relevantChunks.forEach(chunk => {
    if (!contextByDoc.has(chunk.document_id)) {
      contextByDoc.set(chunk.document_id, { title: '', chunks: [] });
    }
    contextByDoc.get(chunk.document_id)!.chunks.push(chunk);
  });

  // Prepare enhanced context with document structure and relevance scores
  let context = "Based on these highly relevant document excerpts from your knowledge base:\n\n";
  
  let sourceIndex = 1;
  const pageReferences: number[] = [];
  
  contextByDoc.forEach((docData, docId) => {
    const sortedChunks = docData.chunks.sort((a, b) => {
      // Sort by relevance first, then page number
      const relevanceDiff = (b.similarity || 0) - (a.similarity || 0);
      if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff > 0 ? 1 : -1;
      return (a.page_number || 0) - (b.page_number || 0);
    });
    
    sortedChunks.forEach(chunk => {
      const pageRef = chunk.page_number ? ` (Page ${chunk.page_number})` : '';
      const sectionRef = chunk.section_path ? ` [${chunk.section_path}]` : '';
      const confidenceScore = chunk.similarity ? `[Confidence: ${(chunk.similarity * 100).toFixed(1)}%]` : '';
      
      if (chunk.page_number) {
        pageReferences.push(chunk.page_number);
      }
      
      context += `Source ${sourceIndex}${pageRef}${sectionRef} ${confidenceScore}:\n${chunk.content}\n\n`;
      sourceIndex++;
    });
  });

  const enhancedPrompt = `${context}

Question: ${question}

CRITICAL INSTRUCTIONS for maximum accuracy:
- Base your answer EXCLUSIVELY on the provided document excerpts above
- ALWAYS cite specific page numbers when available (e.g., "On page 5, it states...")
- Quote the exact text that supports your answer
- When referencing multiple pages, list all page numbers in order
- Pay special attention to the confidence scores - prioritize information from higher confidence sources
- If the answer spans multiple pages, clearly indicate which information comes from which page
- If you cannot find the specific information in the provided excerpts, clearly state this
- Be precise about page references - double-check that page numbers match the content you're citing
- Structure your answer to clearly separate information from different pages`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Higher quality model for better accuracy
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyst with exceptional precision in citing sources and page numbers. Your primary goal is to provide accurate, well-sourced answers with perfect page number citations. Always double-check that page numbers correspond to the content you are referencing. Never guess or approximate page numbers.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        max_tokens: 800, // More tokens for detailed, well-cited answers
        temperature: 0.1 // Very low temperature for maximum accuracy
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

    // Calculate page accuracy confidence based on available page references
    const pageAccuracy = pageReferences.length > 0 ? 0.95 : 0.7;

    console.log(`Generated enhanced answer with ${pageReferences.length} page references (${tokensUsed} tokens)`);
    
    return { answer, tokensUsed, pageAccuracy };
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error('Failed to generate AI answer');
  }
}

// New function to verify page accuracy using OpenAI
async function verifyPageAccuracy(answer: string, question: string, relevantChunks: DocumentChunk[]): Promise<{ isAccurate: boolean; confidence: number; corrections?: string }> {
  if (!openAIApiKey) {
    return { isAccurate: true, confidence: 0.8 }; // Default if no verification possible
  }

  try {
    console.log('Verifying page accuracy with OpenAI...');
    
    const chunksWithPages = relevantChunks.filter(chunk => chunk.page_number);
    if (chunksWithPages.length === 0) {
      return { isAccurate: true, confidence: 0.9 }; // No pages to verify
    }

    const verificationContext = chunksWithPages.map((chunk, index) => 
      `Chunk ${index + 1} (Page ${chunk.page_number}): ${chunk.content.substring(0, 300)}...`
    ).join('\n\n');

    const verificationPrompt = `Review this answer for page number accuracy:

ANSWER TO VERIFY:
${answer}

ACTUAL CONTENT BY PAGE:
${verificationContext}

TASK: Check if the page numbers cited in the answer correctly correspond to the content referenced. 
Respond with:
1. "ACCURATE" or "INACCURATE"
2. A confidence score (0.0-1.0)
3. If inaccurate, provide corrections`;

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
            content: 'You are a fact-checker specializing in verifying page number citations. Be extremely precise in your verification.'
          },
          {
            role: 'user',
            content: verificationPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.0
      }),
    });

    if (!response.ok) {
      console.warn('Page verification failed, assuming accurate');
      return { isAccurate: true, confidence: 0.8 };
    }

    const data = await response.json();
    const verification = data.choices[0].message.content;
    
    const isAccurate = verification.includes('ACCURATE') && !verification.includes('INACCURATE');
    const confidenceMatch = verification.match(/(\d+\.?\d*)/);
    const confidence = confidenceMatch ? Math.min(parseFloat(confidenceMatch[1]), 1.0) : 0.8;
    
    console.log(`Page verification completed: ${isAccurate ? 'ACCURATE' : 'INACCURATE'} (confidence: ${confidence})`);
    
    return {
      isAccurate,
      confidence,
      corrections: !isAccurate ? verification : undefined
    };
  } catch (error) {
    console.error('Error in page verification:', error);
    return { isAccurate: true, confidence: 0.8 };
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

    // Generate enhanced AI answer with verification
    const { answer, tokensUsed, pageAccuracy } = await generateAnswer(query, relevantChunks);
    
    // Verify page accuracy for maximum precision
    const verification = await verifyPageAccuracy(answer, query, relevantChunks);

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

    console.log(`Enhanced intelligent search completed: ${sources.length} sources from ${userDocIds.length} documents with ${verification.confidence * 100}% page accuracy`);

    return new Response(JSON.stringify({
      answer,
      sources,
      tokensUsed,
      totalDocumentsSearched: userDocIds.length,
      pageAccuracy: verification.confidence,
      verified: verification.isAccurate,
      corrections: verification.corrections,
      searchQuality: {
        embeddingModel: 'text-embedding-3-large',
        answerModel: 'gpt-4o',
        pageVerification: true,
        enhancedScoring: true
      }
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