
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

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Q&A assistant request processing...');
    
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
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
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing question:', question, 'for user:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Generate embedding for the question
    console.log('Generating embedding for question...');
    let questionEmbedding = null;
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

    // Step 2: Get user's documents
    console.log('Fetching user documents...');
    const { data: userDocs, error: docsError } = await supabase
      .from('google_documents')
      .select('id, doc_title')
      .eq('user_id', userId)
      .eq('fetched', true);

    if (docsError) {
      console.error('Error fetching user documents:', docsError);
    }

    const userDocIds = userDocs?.map(doc => doc.id) || [];
    console.log('Found user documents:', userDocIds.length, userDocIds);

    let relevantChunks: any[] = [];
    let relevantContext = '';
    let chunks: any[] = [];

    if (userDocIds.length > 0) {
      // Step 3: Search for relevant chunks
      console.log('Searching for relevant document chunks...');
      const { data: chunksData, error: chunksError } = await supabase
        .from('document_chunks')
        .select('content, document_id, embedding')
        .in('document_id', userDocIds);

      chunks = chunksData || [];
      console.log('Raw chunks query result:', {
        chunksFound: chunks.length,
        error: chunksError,
        sampleChunk: chunks[0] ? {
          hasContent: !!chunks[0].content,
          hasEmbedding: !!chunks[0].embedding,
          contentLength: chunks[0].content?.length || 0
        } : null
      });

      if (chunksError) {
        console.error('Error fetching document chunks:', chunksError);
      } else if (chunks.length > 0 && questionEmbedding) {
        // Calculate similarity scores for each chunk
        const chunksWithScores = chunks
          .filter(chunk => chunk.embedding && Array.isArray(chunk.embedding))
          .map(chunk => {
            const similarity = cosineSimilarity(questionEmbedding, chunk.embedding);
            console.log(`Chunk similarity: ${similarity.toFixed(4)} for content: "${chunk.content.substring(0, 100)}..."`);
            return {
              ...chunk,
              similarity
            };
          })
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5); // Get top 5 most relevant chunks

        relevantChunks = chunksWithScores;
        
        // Use chunks with similarity > 0.6 for better relevance
        const highSimilarityChunks = chunksWithScores.filter(chunk => chunk.similarity > 0.6);
        relevantContext = highSimilarityChunks
          .map(chunk => chunk.content)
          .join('\n\n');

        console.log(`Found ${chunksWithScores.length} chunks, using ${highSimilarityChunks.length} with high similarity (>0.6)`);
        console.log('Relevant context length:', relevantContext.length);
      } else if (chunks.length > 0) {
        // Fallback: use first few chunks if no embedding available
        relevantChunks = chunks.slice(0, 3);
        relevantContext = relevantChunks.map(chunk => chunk.content).join('\n\n');
        console.log('Using fallback chunks without similarity scoring');
      }
    }

    // Step 4: Generate answer using GPT with context
    console.log('Generating answer with GPT...');
    
    const systemPrompt = relevantContext 
      ? `You are CareGrowthAI, an expert assistant for digital marketing agencies and home care businesses. 

Your job is to answer questions using the provided context from the user's documents and your knowledge of:
- Agency management and operations
- Marketing strategies for home care
- Hiring and team building
- Compliance and regulations
- Client retention and growth

Always structure your responses with:
1. A clear, actionable answer
2. Step-by-step guidance when applicable  
3. Specific examples or strategies
4. Key metrics or considerations

Context from user's documents:
${relevantContext}

Use the context information when relevant, but also draw on your expertise. If the context doesn't fully address the question, supplement with your knowledge while being clear about what comes from their documents vs. general best practices.

Answer the user's question directly and professionally. If information comes from their uploaded documents, mention that it's based on their documents.`
      : `You are CareGrowthAI, an expert assistant for digital marketing agencies and home care businesses. 

Your job is to answer questions using your knowledge of:
- Agency management and operations
- Marketing strategies for home care
- Hiring and team building
- Compliance and regulations
- Client retention and growth

Always structure your responses with:
1. A clear, actionable answer
2. Step-by-step guidance when applicable  
3. Specific examples or strategies
4. Key metrics or considerations

The user hasn't uploaded relevant documents yet, so provide guidance based on industry best practices and your expertise.`;

    let answer = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
    try {
      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: systemPrompt
            },
            {
              role: 'user',
              content: question
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
      });

      if (!gptResponse.ok) {
        const errorText = await gptResponse.text();
        console.error('GPT API error:', gptResponse.status, errorText);
      } else {
        const gptData = await gptResponse.json();
        if (gptData.choices && gptData.choices[0] && gptData.choices[0].message) {
          answer = gptData.choices[0].message.content;
        }
      }
    } catch (error) {
      console.error('Error generating GPT response:', error);
    }

    // Step 5: Categorize the response
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
              content: 'Based on the question and answer, categorize this into one of these categories: management, marketing, hiring, compliance, or other. Respond with just the category name in lowercase.'
            },
            {
              role: 'user',
              content: `Question: ${question}\n\nAnswer: ${answer}`
            }
          ],
          temperature: 0,
          max_tokens: 10
        }),
      });

      if (categorizationResponse.ok) {
        const categorizationData = await categorizationResponse.json();
        if (categorizationData.choices && categorizationData.choices[0] && categorizationData.choices[0].message) {
          category = categorizationData.choices[0].message.content.trim().toLowerCase();
        }
      }
    } catch (error) {
      console.error('Error categorizing response:', error);
    }

    // Step 6: Log the Q&A interaction
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

    console.log('Q&A processing completed successfully');

    return new Response(JSON.stringify({ 
      answer, 
      category,
      sources: relevantChunks.length,
      debug: {
        documentsFound: userDocIds.length,
        chunksFound: chunks.length,
        relevantChunks: relevantChunks.length,
        contextLength: relevantContext.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in qa-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your question'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
