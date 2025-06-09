
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userId } = await req.json();
    
    if (!question || !userId) {
      throw new Error('Question and userId are required');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing question:', question, 'for user:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Generate embedding for the question
    console.log('Generating embedding for question...');
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
      throw new Error(`Embedding API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const questionEmbedding = embeddingData.data[0].embedding;

    // Step 2: Search for similar document chunks
    console.log('Searching for relevant document chunks...');
    
    // Get user's documents first
    const { data: userDocs, error: docsError } = await supabase
      .from('google_documents')
      .select('id')
      .eq('user_id', userId);

    if (docsError) {
      console.error('Error fetching user documents:', docsError);
    }

    const userDocIds = userDocs?.map(doc => doc.id) || [];

    // Search for relevant chunks using embedding similarity
    // Note: This is a simplified version - in production you'd use pgvector extension
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, document_id')
      .in('document_id', userDocIds)
      .limit(5);

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError);
    }

    const relevantContext = chunks?.map(chunk => chunk.content).join('\n\n') || '';
    console.log('Found relevant context:', relevantContext.length, 'characters');

    // Step 3: Generate answer using GPT with context
    console.log('Generating answer with GPT...');
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
            content: `You are CareGrowthAI, an expert assistant for digital marketing agencies and home care businesses. 

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

If the context doesn't contain relevant information, rely on your expertise in these areas.`
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
      throw new Error(`GPT API error: ${gptResponse.statusText}`);
    }

    const gptData = await gptResponse.json();
    const answer = gptData.choices[0].message.content;

    // Step 4: Categorize the response
    console.log('Categorizing the response...');
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

    const categorizationData = await categorizationResponse.json();
    const category = categorizationData.choices[0].message.content.trim().toLowerCase();

    // Step 5: Log the Q&A interaction
    const { error: logError } = await supabase
      .from('qna_logs')
      .insert({
        agency_id: userId,
        question: question,
        response: answer,
        category: category,
        sources: chunks?.map(chunk => chunk.document_id) || []
      });

    if (logError) {
      console.error('Error logging Q&A:', logError);
    }

    console.log('Q&A processing completed successfully');

    return new Response(JSON.stringify({ 
      answer, 
      category,
      sources: chunks?.length || 0
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
