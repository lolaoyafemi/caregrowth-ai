
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContentWithAI } from './content-generator.ts';
import { buildBusinessContext, personalizeContent } from './business-context.ts';
import { getUserProfile, logPostToHistory } from './database-service.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const startTime = Date.now();
    const { userId, postType, tone, platform, audience } = await req.json();
    console.log('Generate post request:', { userId, postType, tone, platform, audience });

    // Fast validation first
    if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing environment variables');
    }
    if (!userId || !postType || !tone) {
      throw new Error('Missing required parameters: userId, postType, or tone');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parallel operations for better performance
    const [profile] = await Promise.all([
      getUserProfile(supabase, userId)
    ]);
    
    console.log('User profile loaded in:', Date.now() - startTime, 'ms');

    // Pre-compute values for efficiency
    const targetAudience = audience || profile?.ideal_client || 'families needing care';
    const businessContext = buildBusinessContext(profile, audience);
    console.log('Business context built for:', profile?.business_name || 'Unknown business');

    let hook = '', body = '', cta = '';
    let contentSource = '';

    // COMMENTED OUT - Database prompt generation
    /*
    // PRIORITY 1: Try to use a prompt from the database
    console.log('Attempting to generate content from database prompts...');
    const contentFromPrompts = await generateContentFromPrompts(supabase, {
      userId,
      postType,
      tone,
      platform,
      audience: targetAudience,
      businessContext,
      openAIApiKey
    });

    if (contentFromPrompts) {
      console.log('✅ Successfully generated content from database prompt');
      hook = contentFromPrompts.hook;
      body = contentFromPrompts.body;
      cta = contentFromPrompts.cta;
      selectedPrompt = { id: contentFromPrompts.template_id };
      contentSource = 'database_prompt';
    } else {
      console.log('❌ Database prompt generation failed, falling back to AI generation');
    */
      
    // Generate content using coded prompts with AI (optimized)
    console.log('🤖 Generating content with optimized AI processing');
    const generationStart = Date.now();
    
    const generatedContent = await generateContentWithAI({
      userId,
      postType,
      tone,
      platform,
      audience: targetAudience,
      businessContext,
      openAIApiKey
    });

    console.log('AI generation completed in:', Date.now() - generationStart, 'ms');

    let { hook, body, cta } = generatedContent;
    const contentSource = 'coded_prompt_ai';

    // Parallel processing: Apply personalization and prepare final post simultaneously
    const [personalizedHook, personalizedBody, personalizedCta] = profile ? 
      await Promise.all([
        Promise.resolve(personalizeContent(hook, profile, targetAudience, tone, platform)),
        Promise.resolve(personalizeContent(body, profile, targetAudience, tone, platform)),
        Promise.resolve(personalizeContent(cta, profile, targetAudience, tone, platform))
      ]) : [hook, body, cta];

    hook = personalizedHook;
    body = personalizedBody;  
    cta = personalizedCta;

    const finalPost = `${hook}\n\n${body}\n\n${cta}`;

    // Start logging in background (don't await to improve response time)
    const logPromise = logPostToHistory(supabase, userId, postType, tone, platform, targetAudience, finalPost);

    const totalTime = Date.now() - startTime;
    console.log('Post generated successfully in:', totalTime, 'ms', {
      source: contentSource,
      content_length: finalPost.length,
      business_context_used: !!profile
    });

    // Return response immediately, let logging complete in background
    const response = new Response(JSON.stringify({
      post: finalPost,
      hook,
      body,
      cta,
      source: contentSource,
      business_context_used: !!profile,
      content_length: finalPost.length,
      generation_time_ms: totalTime
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

    // Ensure logging completes (but don't block response)
    EdgeRuntime.waitUntil(logPromise);
    
    return response;

  } catch (error) {
    console.error('Error in generate-post function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
