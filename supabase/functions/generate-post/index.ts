
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

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
    const { userId, postType, tone, platform, audience } = await req.json();
    console.log('Generate post request:', {
      userId,
      postType,
      tone,
      platform,
      audience
    });

    if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
      console.error('Missing environment variables');
      throw new Error('Missing environment variables');
    }

    if (!userId || !postType || !tone) {
      throw new Error('Missing required parameters: userId, postType, or tone');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile to understand their business
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    // Get prompt templates for the specified content category and platform
    const { data: prompts, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('category', postType)
      .in('platform', [platform, 'all']);

    console.log('Fetched prompts:', prompts);

    if (promptError) {
      console.error('Prompt fetch error:', promptError);
    }

    let hook = '', body = '', cta = '';
    let selectedPrompt = null;

    // Always try to use a prompt from the database first
    if (prompts && prompts.length > 0) {
      // Separate prompts by platform preference
      const platformSpecificPrompts = prompts.filter(p => p.platform === platform);
      const generalPrompts = prompts.filter(p => p.platform === 'all');
      
      // Choose from platform-specific first, then general
      const availablePrompts = platformSpecificPrompts.length > 0 ? platformSpecificPrompts : generalPrompts;
      
      if (availablePrompts.length > 0) {
        // Randomly select one row from available prompts
        selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
        
        console.log('Selected prompt row:', selectedPrompt);
        
        // Use the hook, body, and cta from the selected prompt
        hook = selectedPrompt.hook || '';
        body = selectedPrompt.body || '';
        cta = selectedPrompt.cta || '';
        
        console.log('Using template from row:', { hook, body, cta });
      }
    }

    // Build comprehensive business context for personalization
    // Prioritize user-entered audience over profile ideal_client
    const targetAudience = audience || (profile?.ideal_client || 'families needing care');
    
    const businessContext = profile ? `
Business Name: ${profile.business_name || 'Home Care Business'}
Services: ${profile.services || profile.core_service || 'Home care services'}
Location: ${profile.location || 'Local area'}
Target Client: ${targetAudience}
Main Offer: ${profile.main_offer || 'Professional home care'}
Differentiator: ${profile.differentiator || 'Compassionate, professional care'}
Big Promise: ${profile.big_promise || 'Exceptional care for your loved ones'}
Client Pain Points: ${Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : profile.pain_points || 'Finding reliable care'}
Audience Problems: ${profile.audience_problem || 'Caregiving challenges'}
Objections: ${Array.isArray(profile.objections) ? profile.objections.join(', ') : profile.objections || 'Cost and trust concerns'}
Testimonial: ${profile.testimonial || 'Trusted by families in our community'}
` : 'Home Care Business providing professional care services';

    // Personalize templates with business context
    const personalizeText = (text) => {
      if (!profile || !text) return text;
      
      return text
        .replace(/\{business_name\}/gi, profile.business_name || 'our business')
        .replace(/\{location\}/gi, profile.location || 'your area')
        .replace(/\{services\}/gi, profile.services || 'our services')
        .replace(/\{core_service\}/gi, profile.core_service || 'our services')
        .replace(/\{ideal_client\}/gi, targetAudience)
        .replace(/\{main_offer\}/gi, profile.main_offer || 'our services')
        .replace(/\{differentiator\}/gi, profile.differentiator || 'professional care')
        .replace(/\{big_promise\}/gi, profile.big_promise || 'exceptional care')
        .replace(/\{pain_points\}/gi, Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : 'common challenges')
        .replace(/\{audience_problem\}/gi, profile.audience_problem || 'caregiving challenges')
        .replace(/\{objections\}/gi, Array.isArray(profile.objections) ? profile.objections.join(', ') : 'common concerns')
        .replace(/\{audience\}/gi, targetAudience)
        .replace(/\{tone\}/gi, tone || 'professional')
        .replace(/\{platform\}/gi, platform || 'social media')
        .replace(/\{testimonial\}/gi, profile.testimonial || 'trusted by our community');
    };

    // If we have a prompt from database, personalize it and enhance with AI for long-form content
    if (selectedPrompt && hook && body && cta) {
      // First personalize the template
      hook = personalizeText(hook);
      body = personalizeText(body);
      cta = personalizeText(cta);

      // Then enhance with OpenAI intelligence for longer, more detailed content
      console.log('Enhancing prompt content with OpenAI for long-form posts...');
      
      const enhancementPrompt = `You are an expert social media copywriter specializing in home care services. I have content from our database that needs to be enhanced into a compelling, long-form social media post.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${targetAudience}
Tone: ${tone}
Platform: ${platform}

Current Content Structure:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Please transform this into a compelling long-form social media post by:

1. EXPANDING THE HOOK: Make it more attention-grabbing and emotionally compelling for "${targetAudience}" - include a story element, question, or surprising statistic that hooks readers immediately
2. DEVELOPING THE BODY: Expand this into 3-4 substantial paragraphs (200-300 words total) that:
   - Tell a relatable story or share valuable insights specific to "${targetAudience}"
   - Address their specific pain points and challenges
   - Showcase expertise and build trust through detailed examples
   - Include specific benefits and outcomes they care about
   - Use the "${tone}" tone throughout while being conversational and engaging
3. STRENGTHENING THE CTA: Make it more compelling and specific to the audience's needs

Create a cohesive, engaging long-form post optimized for ${platform} that:
- Feels authentic and human, not AI-generated
- Speaks directly to "${targetAudience}" using their language and concerns
- Maintains the "${tone}" tone throughout
- Provides real value and builds trust
- Encourages meaningful engagement
- Is 300-400 words total for maximum engagement

Return the enhanced long-form version in the same format:
HOOK: [expanded, compelling hook for ${targetAudience}]
BODY: [detailed 3-4 paragraph body with stories, insights, and value]
CTA: [stronger, more specific call-to-action]`;

      try {
        const enhancementResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert social media copywriter specializing in home care services. Create compelling long-form content that truly resonates with the target audience: "${targetAudience}" using a "${tone}" tone for "${postType}" content on "${platform}". Focus on storytelling, value delivery, and emotional connection.`
              },
              {
                role: 'user',
                content: enhancementPrompt
              }
            ],
            temperature: 0.9,
            max_tokens: 1200,
            top_p: 1,
            frequency_penalty: 0.2,
            presence_penalty: 0.2
          })
        });

        if (enhancementResponse.ok) {
          const enhancementData = await enhancementResponse.json();
          const enhancedContent = enhancementData.choices[0].message.content;
          
          // Parse the enhanced content
          const lines = enhancedContent.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.startsWith('hook:')) {
              hook = line.substring(5).trim();
            } else if (lowerLine.startsWith('body:')) {
              body = line.substring(5).trim();
            } else if (lowerLine.startsWith('cta:')) {
              cta = line.substring(4).trim();
            }
          }
          
          console.log('Enhanced long-form content:', { hook, body, cta });
        } else {
          console.log('Enhancement failed, using personalized template');
        }
      } catch (enhanceError) {
        console.error('Error enhancing content:', enhanceError);
        console.log('Using personalized template without AI enhancement');
      }
    } else {
      // Fallback: Generate completely new long-form content with AI if no prompts available
      console.log('No prompts found, generating new long-form content with OpenAI');
      
      const generationPrompt = `You are an expert social media copywriter specializing in home care services. 

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${targetAudience}
Tone: ${tone}
Platform: ${platform}

Create a compelling long-form social media post (300-400 words) that is specifically tailored to:
- Target Audience: "${targetAudience}" - speak directly to their needs, concerns, and interests
- Tone: "${tone}" - maintain this exact tone throughout
- Content Type: "${postType}" - ensure the content serves this specific purpose
- Platform: "${platform}" - optimize for this platform's best practices and audience behavior

Structure the post with:
1. HOOK: An attention-grabbing opening that immediately resonates with "${targetAudience}" - use a story, question, or insight that stops them scrolling (1-2 sentences)
2. BODY: Value-rich content that:
   - Tells a relatable story or shares valuable insights
   - Addresses specific challenges "${targetAudience}" faces
   - Demonstrates expertise through detailed examples
   - Shows concrete benefits and outcomes
   - Uses "${tone}" tone while being conversational and engaging
   - Is 3-4 substantial paragraphs (200-300 words)
3. CTA: A compelling call-to-action that drives "${targetAudience}" to take meaningful action (1-2 sentences)

Make it authentic, highly relevant, and platform-optimized for ${platform}. Focus on storytelling, emotional connection, and providing real value.

Format your response as:
HOOK: [compelling hook content]
BODY: [detailed, valuable body content in 3-4 paragraphs]
CTA: [strong call-to-action]`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert social media copywriter specializing in home care services. Create compelling long-form content that truly resonates with the target audience "${targetAudience}" with a "${tone}" tone for "${postType}" content on "${platform}". Focus on storytelling, emotional connection, and providing substantial value in 300-400 words.`
              },
              {
                role: 'user',
                content: generationPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1200
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI API error:', errorData);
          throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const generatedContent = data.choices[0].message.content;
        console.log('Generated long-form content:', generatedContent);

        // Parse the generated content
        const lines = generatedContent.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          if (lowerLine.startsWith('hook:')) {
            hook = line.substring(5).trim();
          } else if (lowerLine.startsWith('body:')) {
            body = line.substring(5).trim();
          } else if (lowerLine.startsWith('cta:')) {
            cta = line.substring(4).trim();
          }
        }

        // Fallback parsing if format not followed
        if (!hook && !body && !cta) {
          const contentLines = generatedContent.split('\n').filter(line => line.trim());
          if (contentLines.length >= 3) {
            hook = contentLines[0] || 'Looking for reliable home care services?';
            body = contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence.';
            cta = contentLines[contentLines.length - 1] || 'Contact us today to learn more!';
          } else {
            hook = 'Looking for reliable home care services?';
            body = 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence.';
            cta = 'Contact us today to learn more!';
          }
        }
      } catch (error) {
        console.error('Error generating content:', error);
        // Ultimate fallback
        hook = 'Looking for reliable home care services?';
        body = 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence.';
        cta = 'Contact us today to learn more!';
      }
    }

    const finalPost = `${hook}\n\n${body}\n\n${cta}`;

    // Log post to post_history
    const { error: insertError } = await supabase
      .from('post_history')
      .insert([{
        user_id: userId,
        prompt_category: postType,
        tone,
        platform,
        audience: targetAudience,
        content: finalPost
      }]);

    if (insertError) {
      console.error('Error inserting to post_history:', insertError);
    }

    return new Response(JSON.stringify({
      post: finalPost,
      hook,
      body,
      cta,
      source: selectedPrompt ? 'database_enhanced' : 'ai_generated',
      template_id: selectedPrompt?.id || null,
      available_templates: prompts?.length || 0,
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
