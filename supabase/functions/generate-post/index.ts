
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
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError.message);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const { postType, tone, platform, audience } = requestBody || {};
    
    console.log('Generate post request:', {
      userId: authenticatedUserId,
      postType,
      tone,
      platform,
      audience
    });

    // Validate environment variables
    if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
      console.error('Missing environment variables:', {
        hasOpenAI: !!openAIApiKey,
        hasSupabaseKey: !!supabaseServiceKey,
        hasSupabaseUrl: !!supabaseUrl
      });
      throw new Error('Server configuration error: Missing required environment variables');
    }

    // Validate required parameters
    if (!postType || typeof postType !== 'string' || postType.trim() === '') {
      throw new Error('Missing or invalid required parameter: postType');
    }
    
    if (!tone || typeof tone !== 'string' || tone.trim() === '') {
      throw new Error('Missing or invalid required parameter: tone');
    }

    // Get user profile to understand their business
    let profile;
    try {
      profile = await getUserProfile(supabase, authenticatedUserId);
      console.log('User profile loaded:', !!profile);
    } catch (profileError) {
      console.error('Error loading user profile:', profileError.message);
      // Continue without profile - it's not critical for basic functionality
      profile = null;
    }

    // Build comprehensive business context for personalization
    const targetAudience = audience || (profile?.ideal_client || 'families needing care');
    let businessContext;
    try {
      businessContext = buildBusinessContext(profile, audience);
      console.log('Business context built for:', profile?.business_name || 'Unknown business');
    } catch (contextError) {
      console.error('Error building business context:', contextError.message);
      // Provide minimal context as fallback
      businessContext = { business_name: 'Your Business', core_service: 'service' };
    }

    let hook = '', body = '', cta = '';
    let contentSource = '';

    try {
      // Generate content using database prompts first, then fallback to coded prompts
      console.log('🤖 Generating content with database prompt integration');
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
      contentSource = generatedContent.source || 'ai_generation';
    } catch (generationError) {
      console.error('❌ Content generation failed:', generationError);
      throw new Error(`Content generation failed: ${generationError.message}`);
    }

    // Apply additional personalization if we have business profile
    if (profile) {
      console.log('Applying additional business personalization...');
      hook = personalizeContent(hook, profile, targetAudience, tone, platform);
      body = personalizeContent(body, profile, targetAudience, tone, platform);
      cta = personalizeContent(cta, profile, targetAudience, tone, platform);
    }

    const finalPost = `${hook} ${body} ${cta}`;

    // Log post to post_history
    try {
      await logPostToHistory(supabase, authenticatedUserId, postType, tone, platform, targetAudience, finalPost);
    } catch (logError) {
      console.error('Error logging post to history:', logError.message);
      // Don't fail the entire request if logging fails
    }

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
