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

    // Get user's business profile for personalized context
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get shared knowledge base for context (super admin documents)
    const { data: sharedChunks } = await supabaseClient
      .from('document_chunks')
      .select('content, document_id, page_number')
      .eq('is_shared', true)
      .limit(15);

    // Build knowledge context from shared documents
    let context = '';
    if (sharedChunks && sharedChunks.length > 0) {
      context = sharedChunks
        .map(chunk => `Page ${chunk.page_number || 'N/A'}: ${chunk.content}`)
        .join('\n\n')
        .substring(0, 4000); // Increased context size
    }

    // Build business context for personalized responses
    let businessContext = '';
    if (userProfile) {
      businessContext = `
BUSINESS CONTEXT:
Business Name: ${userProfile.business_name || 'Your business'}
Services: ${userProfile.services || userProfile.core_service || 'Home care services'}
Location: ${userProfile.location || 'Your area'}
Phone Number: ${userProfile.phone_number || 'Contact information'}
Target Client: ${userProfile.ideal_client || 'Families needing care'}
Main Offer: ${userProfile.main_offer || 'Professional home care'}
Differentiator: ${userProfile.differentiator || 'Quality care services'}
Big Promise: ${userProfile.big_promise || 'Exceptional care for loved ones'}
Client Pain Points: ${Array.isArray(userProfile.pain_points) ? userProfile.pain_points.join(', ') : userProfile.pain_points || 'Finding reliable care'}
Audience Problems: ${userProfile.audience_problem || 'Caregiving challenges'}
Common Objections: ${Array.isArray(userProfile.objections) ? userProfile.objections.join(', ') : userProfile.objections || 'Cost and trust concerns'}
Testimonial: ${userProfile.testimonial || 'Trusted by families in our community'}
      `;
    }

    // Build conversation context with enhanced system message
    const messages = [
      {
        role: 'system',
        content: `You are Jared, an experienced business consultant specializing in home care agencies. You work with CareGrowthAI and have deep knowledge of agency management, marketing, hiring, and compliance. You speak naturally and conversationally, like a trusted advisor.
        
        ${businessContext ? `${businessContext}\n\n` : ''}
        ${context ? `KNOWLEDGE BASE CONTEXT:\n${context}\n\n` : ''}
        
        COMMUNICATION STYLE:
        - Speak naturally and conversationally, as if talking to a friend or colleague
        - Never use markdown formatting like ### for headers or ** for bold text
        - Avoid bullet points or numbered lists - speak in flowing sentences and paragraphs
        - Don't start responses with "Here are some tips" or "Let me break this down"
        - Reference their business personally when relevant (e.g., "For your ${userProfile?.business_name || 'business'} in ${userProfile?.location || 'your area'}")
        - When citing knowledge base information, weave it naturally into conversation (e.g., "I remember reading that..." or "From what I've seen work well...")
        - Keep responses conversational yet informative (200-400 words)
        - Sound like an experienced consultant sharing insights, not an AI providing information
        - Use their specific business challenges and differentiators to make advice personal and relevant`
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
        max_tokens: 800, // Increased for more detailed responses
        temperature: 0.3, // Lower temperature for more consistent, factual responses
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
            error: (error as Error).message
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});