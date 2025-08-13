
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
    // SECURITY: Validate JWT token and extract userId
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Missing or invalid authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Use the authenticated user's ID instead of trusting client input
    const authenticatedUserId = user.id;
    const { postType, tone, platform, audience } = await req.json();
    console.log('Generate post request:', {
      userId: authenticatedUserId,
      postType,
      tone,
      platform,
      audience
    });

    if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
      console.error('Missing environment variables');
      throw new Error('Missing environment variables');
    }

    if (!postType || !tone) {
      throw new Error('Missing required parameters: postType or tone');
    }

    // Get user profile to understand their business
    const profile = await getUserProfile(supabase, authenticatedUserId);
    console.log('User profile loaded:', !!profile);

    // Build comprehensive business context for personalization
    const targetAudience = audience || (profile?.ideal_client || 'families needing care');
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
      
    try {
      // Generate content using coded prompts with AI
      console.log('🤖 Generating content using coded prompts with AI');
      const generatedContent = await generateContentWithAI({
        userId: authenticatedUserId,
        postType,
        tone,
        platform,
        audience: targetAudience,
        businessContext,
        openAIApiKey
      });

      console.log('✅ Content generation successful:', generatedContent);
      
      hook = generatedContent.hook;
      body = generatedContent.body;
      cta = generatedContent.cta;
      contentSource = 'coded_prompt_ai';
    } catch (generationError) {
      console.error('❌ Content generation failed:', generationError);
      throw new Error(`Content generation failed: ${generationError.message}`);
    }
    
    // } // End of commented database logic

    // Apply additional personalization if we have business profile
    if (profile) {
      console.log('Applying additional business personalization...');
      hook = personalizeContent(hook, profile, targetAudience, tone, platform);
      body = personalizeContent(body, profile, targetAudience, tone, platform);
      cta = personalizeContent(cta, profile, targetAudience, tone, platform);
    }

    const finalPost = `${hook} ${body} ${cta}`;

    // Log post to post_history
    await logPostToHistory(supabase, authenticatedUserId, postType, tone, platform, targetAudience, finalPost);

    console.log('Final post generated successfully:', {
      source: contentSource,
      content_length: finalPost.length,
      business_context_used: !!profile
    });

    return new Response(JSON.stringify({
      post: finalPost,
      hook,
      body,
      cta,
      source: contentSource,
      business_context_used: !!profile,
      content_length: finalPost.length
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

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
