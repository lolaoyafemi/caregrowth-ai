import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get JWT token and verify user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { question, conversationHistory } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Streaming QA request:', { userId: user.id, question: question.substring(0, 100) });

    // Get user documents for context
    const { data: documents } = await supabaseClient
      .from('document_chunks')
      .select('content, document_id')
      .eq('user_id', user.id)
      .limit(10);

    const context = documents?.map(doc => doc.content).join('\n\n') || '';
    
    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are Jared, a helpful AI assistant for CareGrowthAI specializing in agency management, marketing, hiring, and compliance. 
        ${context ? `Here's relevant context from the user's documents: ${context.substring(0, 2000)}` : ''}
        Provide helpful, actionable advice. Keep responses conversational and under 300 words unless more detail is specifically requested.`
      },
      ...(conversationHistory || []).slice(-6), // Last 6 messages for context
      { role: 'user', content: question }
    ];

    // Stream response from OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Create Server-Sent Events stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          let fullResponse = '';
          let tokensUsed = 0;
          const startTime = Date.now();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

            for (const line of lines) {
              const data = line.replace('data: ', '');
              if (data === '[DONE]') {
                // Send final metadata
                const responseTime = Date.now() - startTime;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'metadata',
                  responseTime,
                  tokensUsed,
                  fullResponse
                })}\n\n`));
                
                // Log the interaction
                await supabaseClient.from('qna_logs').insert({
                  agency_id: user.id,
                  question,
                  answer: fullResponse,
                  category: 'general',
                  response_time_ms: responseTime,
                  tokens_used: tokensUsed
                });
                
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  fullResponse += content;
                  tokensUsed++;
                  
                  // Send streaming chunk
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'content',
                    content,
                    fullResponse
                  })}\n\n`));
                }
              } catch (e) {
                console.log('Error parsing chunk:', e);
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error.message
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});