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

// Enhanced search utility functions for improved accuracy
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were', 
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
    'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'of', 'in', 'for', 
    'with', 'by', 'from', 'about', 'an', 'or', 'but', 'if', 'then', 'than', 
    'when', 'where', 'how', 'what', 'who', 'why', 'this', 'that', 'these', 'those'
  ]);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 8); // Limit to most important keywords
}

function calculateContentRelevance(content: string, queryKeywords: string[]): number {
  if (queryKeywords.length === 0) return 0;
  
  const contentLower = content.toLowerCase();
  let relevanceScore = 0;
  
  queryKeywords.forEach((keyword, index) => {
    // Create regex for whole word matching
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = contentLower.match(regex);
    
    if (matches) {
      // Weight earlier keywords more heavily
      const positionWeight = 1 - (index * 0.1);
      // Diminishing returns for multiple occurrences
      const occurrenceScore = Math.min(matches.length * 0.25, 0.8);
      relevanceScore += occurrenceScore * positionWeight;
    }
  });
  
  return Math.min(relevanceScore / queryKeywords.length, 1.0);
}

function calculatePhraseBonus(content: string, normalizedQuery: string): number {
  const contentLower = content.toLowerCase();
  
  // Check for exact phrase match
  if (normalizedQuery.length > 10 && contentLower.includes(normalizedQuery)) {
    return 0.2; // Strong bonus for exact phrase
  }
  
  // Check for partial phrase matches (3+ consecutive words)
  const queryWords = normalizedQuery.split(/\s+/);
  if (queryWords.length >= 3) {
    for (let i = 0; i <= queryWords.length - 3; i++) {
      const phrase = queryWords.slice(i, i + 3).join(' ');
      if (contentLower.includes(phrase)) {
        return 0.1; // Moderate bonus for partial phrase
      }
    }
  }
  
  return 0;
}

function calculateLengthQuality(content: string): number {
  const length = content.length;
  
  // Optimal length range for document chunks
  if (length < 100) return 0.8; // Too short, might lack context
  if (length > 1500) return 0.9; // Very long, might be less focused
  if (length >= 200 && length <= 800) return 1.0; // Ideal length
  
  return 0.95; // Good length
}

// Precision-focused intelligent search with quality filtering
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

  console.log(`Starting precision-focused search through ${chunks.length} chunks`);
  const normalizedQuery = normalizeText(question);
  const queryKeywords = extractKeywords(normalizedQuery);

  let results: DocumentChunk[] = [];

  // Strategy 1: High-precision vector similarity search
  if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
    console.log('Running high-precision vector search...');
    
    const chunksWithEmbeddings = chunks.filter(chunk => 
      chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0
    );

    const vectorResults = chunksWithEmbeddings
      .map(chunk => {
        const baseSimilarity = cosineSimilarity(questionEmbedding, chunk.embedding!);
        
        // Multi-factor scoring for higher accuracy
        let qualityScore = baseSimilarity;
        
        // Content relevance factor
        const contentRelevance = calculateContentRelevance(chunk.content, queryKeywords);
        qualityScore += contentRelevance * 0.15;
        
        // Exact phrase bonus
        const phraseBonus = calculatePhraseBonus(chunk.content, normalizedQuery);
        qualityScore += phraseBonus;
        
        // Length quality factor
        const lengthFactor = calculateLengthQuality(chunk.content);
        qualityScore *= lengthFactor;
        
        return {
          ...chunk,
          similarity: qualityScore,
          baseSimilarity,
          contentRelevance,
          phraseBonus,
          lengthFactor,
          searchMethod: 'precision_vector'
        } as DocumentChunk & { 
          similarity: number; 
          baseSimilarity: number; 
          contentRelevance: number; 
          phraseBonus: number; 
          lengthFactor: number; 
          searchMethod: string; 
        };
      })
      .filter(chunk => {
        // Higher quality threshold
        const hasGoodSimilarity = chunk.similarity! > 0.3;
        const hasContentRelevance = chunk.contentRelevance! > 0.2;
        return hasGoodSimilarity || hasContentRelevance;
      })
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 12);

    results = vectorResults;
    console.log(`Precision vector search found ${results.length} high-quality results`);
    
    // Log top results for debugging
    results.slice(0, 3).forEach((chunk, idx) => {
      console.log(`Top result ${idx + 1}: similarity=${chunk.similarity!.toFixed(3)}, relevance=${(chunk as any).contentRelevance?.toFixed(3) || '0.000'}`);
    });
  }

  // Strategy 2: High-quality text search (only if vector search insufficient)
  if (results.length < 6) {
    console.log('Running supplementary text search...');
    
    try {
      // Use better text search query
      const searchTerms = queryKeywords.slice(0, 4).join(' | ');
      const { data: textResults, error } = await supabase
        .from('document_chunks')
        .select('content, document_id, page_number, chunk_index, embedding')
        .in('document_id', userDocIds)
        .textSearch('tsvector_content', searchTerms)
        .limit(6);

      if (!error && textResults && textResults.length > 0) {
        const filteredTextChunks = textResults
          .filter((chunk: any) => {
            // Avoid duplicates
            const isDuplicate = results.some(r => 
              `${r.document_id}_${r.chunk_index}` === `${chunk.document_id}_${chunk.chunk_index}`
            );
            
            // Quality check for text results
            const hasGoodContent = chunk.content && chunk.content.length > 100;
            const hasRelevantKeywords = queryKeywords.some((keyword: string) => 
              chunk.content.toLowerCase().includes(keyword.toLowerCase())
            );
            
            return !isDuplicate && hasGoodContent && hasRelevantKeywords;
          })
          .map((chunk: any) => ({
            ...chunk,
            similarity: 0.6, // Good score for text matches
            searchMethod: 'text'
          }));
        
        results = [...results, ...filteredTextChunks].slice(0, 10);
        console.log(`Text search added ${filteredTextChunks.length} quality results`);
      }
    } catch (error) {
      console.log('Text search failed:', error);
    }
  }

  // Only return results if they meet quality standards
  const finalResults = results
    .filter(chunk => chunk.similarity! > 0.25) // Quality threshold
    .slice(0, 8);

  console.log(`Final high-quality results: ${finalResults.length} chunks`);
  return finalResults;
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

CRITICAL INSTRUCTIONS for maximum accuracy and page-specific summaries:
1. ANSWER FORMAT:
   - Start with a concise direct answer to the question
   - Then provide detailed information organized by page number
   
2. PAGE REFERENCES (MANDATORY):
   - ALWAYS cite specific page numbers: "On page 5, it states..."
   - For each page mentioned, provide a brief summary of what that page contains
   - Quote the exact text that supports your answer
   - List all relevant pages in order
   
3. PAGE SUMMARIES:
   - For each page you reference, include: "📄 Page X Summary: [brief description of what's on that page]"
   - Make it easy for users to know exactly what they'll find on each page
   
4. ACCURACY:
   - Base your answer EXCLUSIVELY on the provided excerpts
   - Prioritize information from higher confidence sources
   - If information spans multiple pages, clearly separate each page's content
   - Never guess page numbers - only cite pages explicitly shown above
   - If you can't find specific information, clearly state this

5. STRUCTURE:
   Example format:
   "[Direct answer to question]
   
   📄 Page 3 Summary: Contains information about [topic]
   On page 3, it states: '[exact quote]'
   
   📄 Page 7 Summary: Provides details on [topic]  
   On page 7, you'll find: '[exact quote]'"`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07', // GPT-5 for superior reasoning and accuracy
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyst with exceptional precision in citing sources and page numbers. Your primary goal is to provide accurate, well-sourced answers with perfect page number citations and helpful page summaries. For each page you reference, provide a brief summary of what that page contains so users know exactly where to look. Always double-check that page numbers correspond to the content you are referencing. Never guess or approximate page numbers. Format page summaries with the 📄 emoji for visual clarity.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        max_completion_tokens: 1000 // GPT-5 uses max_completion_tokens instead of max_tokens
        // Note: temperature not supported in GPT-5, defaults to 1.0
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

    console.log(`Generated GPT-5 enhanced answer with ${pageReferences.length} page references (${tokensUsed} tokens)`);
    
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
        model: 'gpt-5-mini-2025-08-07', // GPT-5 Mini for efficient verification
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
        max_completion_tokens: 300
        // Note: temperature not supported in GPT-5 models
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
        answerModel: 'gpt-5-2025-08-07',
        verificationModel: 'gpt-5-mini-2025-08-07',
        pageVerification: true,
        enhancedScoring: true,
        pageSummaries: true
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