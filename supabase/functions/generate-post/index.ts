
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContentWithAI } from './content-generator.ts';
import { buildBusinessContext, personalizeContent, buildCaregivingContext, selectContentAnchor, selectEngagementHook, selectDemandMoment } from './business-context.ts';
import { getUserProfile, logPostToHistory, getContentMemory, buildContentMemoryContext, extractTopicKeywords } from './database-service.ts';

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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
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
      console.error('Failed to parse request body:', (parseError as Error).message);
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
    
    const { postType, tone, platform, audience, subject, post_format, post_index } = requestBody || {};
    const isCarousel = post_format === 'carousel';
    
    console.log('Generate post request:', {
      userId: authenticatedUserId,
      postType,
      tone,
      platform,
      audience,
      subject,
      post_format: post_format || 'single',
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
      console.error('Error loading user profile:', (profileError as Error).message);
      profile = null;
    }

    // Fetch Content Memory (recent posts) for repetition avoidance
    let contentMemory: any[] = [];
    let memoryContext = '';
    try {
      contentMemory = await getContentMemory(supabase, authenticatedUserId, 50);
      memoryContext = buildContentMemoryContext(contentMemory);
      console.log(`📝 Content Memory loaded: ${contentMemory.length} recent posts`);
    } catch (memoryError) {
      console.error('Error loading content memory:', (memoryError as Error).message);
    }

    // Build comprehensive business context for personalization
    const targetAudience = audience || (profile?.ideal_client || 'families needing care');
    let businessContext;
    try {
      businessContext = buildBusinessContext(profile, audience);
      console.log('Business context built for:', profile?.business_name || 'Unknown business');
    } catch (contextError) {
      console.error('Error building business context:', (contextError as Error).message);
      businessContext = { business_name: 'Your Business', core_service: 'service' };
    }

    let hook = '', body = '', cta = '';
    let contentSource = '';
    let slideTexts: string[] = [];

    try {
      // Build caregiving context and select content anchor
      const postIdx = post_index || 0;
      const caregivingContext = buildCaregivingContext(postIdx);
      const selectedAnchor = selectContentAnchor(postIdx);
      const enrichedBusinessContext = (typeof businessContext === 'string' ? businessContext : JSON.stringify(businessContext)) + '\n' + caregivingContext + memoryContext;

      console.log('🤖 Generating content with database prompt integration + caregiving context + content memory');
      const generatedContent = await generateContentWithAI({
        userId: authenticatedUserId,
        postType,
        tone: profile?.tone_preference || tone,
        platform,
        audience: targetAudience,
        subject,
        businessContext: enrichedBusinessContext,
        openAIApiKey
      });

      console.log('✅ Content generation successful:', generatedContent);
      
      hook = generatedContent.hook;
      body = generatedContent.body;
      cta = generatedContent.cta;
      contentSource = generatedContent.source || 'ai_generation';
    } catch (generationError) {
      console.error('❌ Content generation failed:', generationError);
      throw new Error(`Content generation failed: ${(generationError as Error).message}`);
    }

    // For carousel posts, split body into slide-sized chunks
    if (isCarousel) {
      const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      const slideCount = Math.min(Math.max(sentences.length, 3), 4);
      const perSlide = Math.ceil(sentences.length / slideCount);
      slideTexts = [];
      for (let i = 0; i < slideCount; i++) {
        slideTexts.push(sentences.slice(i * perSlide, (i + 1) * perSlide).join(' ').trim());
      }
      // Add CTA as final slide
      slideTexts.push(cta);
      console.log(`📸 Carousel: generated ${slideTexts.length} slides`);
    }

    // Apply additional personalization if we have business profile
    if (profile) {
      console.log('Applying additional business personalization...');
      hook = personalizeContent(hook, profile, targetAudience, tone, platform);
      body = personalizeContent(body, profile, targetAudience, tone, platform);
      cta = personalizeContent(cta, profile, targetAudience, tone, platform);
      if (isCarousel) {
        slideTexts = slideTexts.map(s => personalizeContent(s, profile, targetAudience, tone, platform));
      }
    }

    const finalPost = `${hook}\n\n${body}\n\n${cta}`.trim();

    // Extract topic keywords from the generated caption
    const topicKeywords = extractTopicKeywords(finalPost);
    console.log('📌 Extracted topic keywords:', topicKeywords);

    // Generate headline (max 10 words) and subheadline from hook
    const headline = hook.split(/[.!?]/)[0]?.trim().split(/\s+/).slice(0, 10).join(' ') || hook.substring(0, 60);
    const subheadline = hook.length > headline.length ? hook.substring(headline.length).trim().replace(/^[.!?,\s]+/, '') : '';

    // Select engagement hook (~40% of posts)
    const postIdx = post_index || 0;
    const engagementHook = selectEngagementHook(postIdx, selectedAnchor.anchor);

    // Select demand moment (~every 4-5 posts)
    const demandMoment = selectDemandMoment(postIdx);

    // Log post to post_history
    try {
      await logPostToHistory(supabase, authenticatedUserId, postType, tone, platform, targetAudience, finalPost);
    } catch (logError) {
      console.error('Error logging post to history:', (logError as Error).message);
    }

    console.log('Final post generated successfully:', {
      source: contentSource,
      content_length: finalPost.length,
      business_context_used: !!profile,
      headline,
      post_format: isCarousel ? 'carousel' : 'single',
      engagement_hook: engagementHook ? engagementHook.type : 'none',
      demand_moment: demandMoment ? demandMoment.type : 'none',
      topic_keywords: topicKeywords,
      content_memory_size: contentMemory.length,
    });

    return new Response(JSON.stringify({
      post: finalPost,
      hook,
      body,
      cta,
      headline,
      subheadline,
      post_format: isCarousel ? 'carousel' : 'single',
      slide_texts: isCarousel ? slideTexts : undefined,
      content_anchor: selectedAnchor.anchor,
      content_anchor_label: selectedAnchor.label,
      engagement_hook: engagementHook?.prompt || null,
      engagement_hook_type: engagementHook?.type || null,
      demand_moment_type: demandMoment?.type || null,
      demand_moment_text: demandMoment?.text || null,
      post_type: postType,
      topic_keywords: topicKeywords,
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
      error: (error as Error).message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
