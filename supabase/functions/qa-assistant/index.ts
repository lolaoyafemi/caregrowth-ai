
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

// Enhanced cosine similarity function with validation
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

// Enhanced search with multiple strategies
async function findRelevantChunks(questionEmbedding: number[] | null, chunks: any[], question: string): Promise<any[]> {
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
        const similarity = cosineSimilarity(questionEmbedding, chunk.embedding);
        console.log(`Chunk similarity: ${similarity.toFixed(4)} for content: "${chunk.content.substring(0, 100)}..."`);
        return {
          ...chunk,
          similarity,
          searchMethod: 'embedding'
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    if (chunksWithScores.length > 0) {
      // Use a much lower threshold and adaptive approach
      const topScore = chunksWithScores[0].similarity;
      const minThreshold = 0.15; // Much lower base threshold
      const adaptiveThreshold = Math.max(minThreshold, topScore * 0.5); // 50% of top score
      
      let relevantChunks = chunksWithScores.filter(chunk => chunk.similarity > adaptiveThreshold);
      
      // If we still have no chunks, take the top 3 chunks regardless of score
      if (relevantChunks.length === 0 && chunksWithScores.length > 0) {
        relevantChunks = chunksWithScores.slice(0, 3);
        console.log(`No chunks above threshold, taking top 3 chunks with scores: ${relevantChunks.map(c => c.similarity.toFixed(4)).join(', ')}`);
      } else {
        console.log(`Found ${relevantChunks.length} chunks above adaptive threshold ${adaptiveThreshold.toFixed(3)}`);
      }
      
      return relevantChunks.slice(0, 5); // Limit to top 5
    }
  }

  // Strategy 2: Keyword-based search (fallback)
  console.log('Using keyword-based search as fallback');
  const questionWords = question.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2) // Lower threshold for words
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
    .filter(chunk => chunk.similarity > 0.1) // Lower threshold for keyword matching
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  if (keywordMatches.length > 0) {
    console.log(`Keyword search found ${keywordMatches.length} relevant chunks`);
    return keywordMatches;
  }

  // Strategy 3: If nothing else works, return first few chunks
  console.log('No relevant chunks found, returning first 2 chunks as fallback');
  return chunks.slice(0, 2).map(chunk => ({
    ...chunk,
    similarity: 0.1,
    searchMethod: 'fallback'
  }));
}

// Function to clean up response formatting
function cleanResponseFormatting(text: string): string {
  return text
    // Remove markdown headers (#, ##, ###, etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markdown (**text**, *text*)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Clean up excessive spacing
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Enhanced answer generation with better context management
async function generateContextualAnswer(question: string, relevantChunks: any[], openAIApiKey: string): Promise<{ answer: string; tokensUsed?: number }> {
  const hasRelevantContext = relevantChunks.length > 0;
  
  // Build context with source attribution
  let contextText = '';
  if (hasRelevantContext) {
    contextText = relevantChunks
      .map((chunk, index) => `Source ${index + 1}: ${chunk.content}`)
      .join('\n\n');
  }

  const systemPrompt = hasRelevantContext 
    ? `You are Jared, a highly experienced consultant specializing in digital marketing agencies and home care businesses. Your expertise spans:

• Agency Operations & Management: Streamlining workflows, team coordination, client management systems
• Home Care Marketing: Patient acquisition strategies, family engagement, community outreach
• Team Development: Hiring best practices, training protocols, performance management
• Compliance & Regulations: Healthcare standards, documentation requirements, quality assurance
• Business Growth: Scaling strategies, revenue optimization, market expansion

RESPONSE GUIDELINES:
1. Provide clear, actionable guidance without using markdown formatting (no #, *, or special symbols)
2. Structure responses with numbered points or clear paragraphs for readability
3. Draw primarily from the provided context when relevant, noting "based on your documents"
4. Supplement with industry expertise when context is limited
5. Include specific examples, metrics, or implementation steps
6. Maintain a professional yet conversational tone
7. Focus on practical solutions that can be implemented immediately

CONTEXT FROM USER'S DOCUMENTS:
${contextText}

Analyze the user's question and provide comprehensive guidance by seamlessly blending information from their documents with your professional expertise. Prioritize actionable insights and specific recommendations.`
    : `You are Jared, a highly experienced consultant specializing in digital marketing agencies and home care businesses. Your expertise includes:

• Agency Operations & Management: Workflow optimization, team coordination, client systems
• Home Care Marketing: Patient acquisition, family engagement, community partnerships  
• Team Development: Strategic hiring, comprehensive training, performance systems
• Compliance & Regulations: Healthcare standards, documentation, quality protocols
• Business Growth: Scaling methodologies, revenue strategies, market development

RESPONSE GUIDELINES:
1. Provide clear, actionable guidance without using markdown formatting (no #, *, or special symbols)
2. Structure responses with numbered points or clear paragraphs
3. Include specific examples, proven strategies, and implementation frameworks
4. Reference industry benchmarks and best practices
5. Maintain a professional yet approachable tone
6. Focus on solutions that deliver immediate and long-term value

Note: I don't have access to your specific documents for this question, so I'm providing guidance based on proven industry strategies and best practices.`;

  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 0.9,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('OpenAI API error:', gptResponse.status, errorText);
      throw new Error(`OpenAI API error: ${gptResponse.status}`);
    }

    const gptData = await gptResponse.json();
    
    if (!gptData.choices || !gptData.choices[0] || !gptData.choices[0].message) {
      console.error('Invalid response structure from OpenAI');
      throw new Error('Invalid response from OpenAI');
    }

    // Clean up the response formatting
    const cleanedAnswer = cleanResponseFormatting(gptData.choices[0].message.content);

    return {
      answer: cleanedAnswer,
      tokensUsed: gptData.usage?.total_tokens
    };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting enhanced Q&A assistant request processing...');
    
    const requestBody = await req.json();
    console.log('Request received:', { 
      hasQuestion: !!requestBody.question,
      hasUserId: !!requestBody.userId,
      questionLength: requestBody.question?.length || 0
    });
    
    const { question, userId } = requestBody;
    
    if (!question || !userId) {
      console.error('Missing required fields:', { question: !!question, userId: !!userId });
      return new Response(JSON.stringify({ 
        error: 'Question and userId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing question for user:', userId);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Generate embedding for the question
    console.log('Generating embedding for question...');
    let questionEmbedding: number[] | null = null;
    
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: question,
        }),
      });

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text();
        console.error('Embedding API error:', embeddingResponse.status, errorText);
        // Continue without embedding-based search
      } else {
        const embeddingData = await embeddingResponse.json();
        questionEmbedding = embeddingData.data[0].embedding;
        console.log('Generated question embedding, vector length:', questionEmbedding.length);
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Continue without embedding-based search
    }

    // Step 2: Get user's documents and chunks
    console.log('Fetching user documents and chunks...');
    const { data: userDocs, error: docsError } = await supabase
      .from('google_documents')
      .select('id, doc_title')
      .eq('user_id', userId)
      .eq('fetched', true);

    if (docsError) {
      console.error('Error fetching user documents:', docsError);
    }

    const userDocIds = userDocs?.map(doc => doc.id) || [];
    console.log('Found user documents:', userDocIds.length);

    let relevantChunks: any[] = [];
    let allChunks: any[] = [];

    if (userDocIds.length > 0) {
      // Fetch all chunks for user's documents
      const { data: chunksData, error: chunksError } = await supabase
        .from('document_chunks')
        .select('content, document_id, embedding, chunk_index')
        .in('document_id', userDocIds);

      allChunks = chunksData || [];
      console.log('Retrieved chunks:', {
        totalChunks: allChunks.length,
        chunksWithEmbeddings: allChunks.filter(c => c.embedding).length,
        averageContentLength: allChunks.length > 0 
          ? Math.round(allChunks.reduce((sum, c) => sum + (c.content?.length || 0), 0) / allChunks.length)
          : 0
      });

      if (chunksError) {
        console.error('Error fetching document chunks:', chunksError);
      } else {
        // Find relevant chunks using enhanced search
        relevantChunks = await findRelevantChunks(questionEmbedding, allChunks, question);
        console.log(`Selected ${relevantChunks.length} relevant chunks from ${allChunks.length} total`);
      }
    }

    // Step 3: Generate answer using enhanced context
    console.log('Generating enhanced answer...');
    let answer = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
    let tokensUsed = 0;

    try {
      const result = await generateContextualAnswer(question, relevantChunks, openAIApiKey);
      answer = result.answer;
      tokensUsed = result.tokensUsed || 0;
      console.log('Successfully generated answer, tokens used:', tokensUsed);
    } catch (error) {
      console.error('Error generating answer:', error);
    }

    // Step 4: Categorize the response
    console.log('Categorizing the response...');
    let category = 'other';
    try {
      const categorizationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'Categorize this Q&A interaction into one category: management, marketing, hiring, compliance, or other. Respond with only the category name in lowercase.'
            },
            {
              role: 'user',
              content: `Question: ${question}\n\nAnswer: ${answer.substring(0, 500)}`
            }
          ],
          temperature: 0,
          max_tokens: 10
        }),
      });

      if (categorizationResponse.ok) {
        const categorizationData = await categorizationResponse.json();
        if (categorizationData.choices?.[0]?.message?.content) {
          category = categorizationData.choices[0].message.content.trim().toLowerCase();
        }
      }
    } catch (error) {
      console.error('Error categorizing response:', error);
    }

    // Step 5: Log the Q&A interaction with enhanced metadata
    try {
      const { error: logError } = await supabase
        .from('qna_logs')
        .insert({
          agency_id: userId,
          question: question,
          response: answer,
          category: category,
          sources: relevantChunks.map(chunk => chunk.document_id) || []
        });

      if (logError) {
        console.error('Error logging Q&A:', logError);
      }
    } catch (error) {
      console.error('Error logging Q&A interaction:', error);
    }

    console.log('Enhanced Q&A processing completed successfully');

    return new Response(JSON.stringify({ 
      answer, 
      category,
      sources: relevantChunks.length,
      debug: {
        documentsFound: userDocIds.length,
        chunksFound: allChunks.length,
        relevantChunks: relevantChunks.length,
        searchMethod: relevantChunks[0]?.searchMethod || 'none',
        tokensUsed: tokensUsed,
        hasEmbedding: !!questionEmbedding
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced qa-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your question'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
