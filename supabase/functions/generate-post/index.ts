
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

    // Build comprehensive business context for personalization
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

    // Always try to use a prompt from the database first, but rephrase it intelligently
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
        
        // Use AI to intelligently rephrase and expand the database prompts for longer, more contextual content
        const rephrasePrompt = `You are an expert social media copywriter specializing in creating compelling, longer-form social media content. I have a template from our content library that needs to be intelligently rephrased, expanded, and made more contextual.

Business Context:
${businessContext}

Original Template:
HOOK: ${selectedPrompt.hook}
BODY: ${selectedPrompt.body}
CTA: ${selectedPrompt.cta}

Content Category: ${postType}
Target Audience: ${targetAudience}
Tone: ${tone}
Platform: ${platform}

Please intelligently rephrase and significantly expand this template by:

1. EXPANDING THE HOOK (2-3 sentences): 
   - Rephrase using different words while keeping the core emotional impact
   - Add a compelling follow-up sentence that draws readers deeper
   - Make it highly relevant to "${targetAudience}" with specific details
   - Create immediate emotional connection and curiosity

2. ENRICHING THE BODY (4-6 substantial paragraphs, 400-500 words):
   - Rephrase all content using fresh language and sentence structures
   - Add specific, realistic scenarios and examples that "${targetAudience}" can relate to
   - Include detailed storytelling elements that paint vivid pictures
   - Weave in emotional moments and concrete benefits
   - Add context about common challenges and real-world situations
   - Include subtle social proof and credibility indicators
   - Make it conversational and engaging with a "${tone}" tone
   - Ensure each paragraph builds on the previous one logically

3. STRENGTHENING THE CTA (2-3 sentences):
   - Rephrase using different compelling language
   - Add urgency and emotional motivation
   - Include a secondary benefit or reassurance
   - Make it feel natural and non-pushy

CRITICAL REQUIREMENTS:
- Create 400-500 word posts with rich, contextual storytelling
- Use different vocabulary, sentence structures, and expressions throughout
- Add specific scenarios, examples, and emotional moments
- Maintain the "${tone}" tone while being conversational and engaging
- Keep placeholders like {business_name}, {ideal_client}, etc. intact
- Make it feel completely fresh and natural, not like a template
- Ensure high relevance to "${targetAudience}" with specific details
- Optimize for ${platform} engagement with platform-appropriate language
- Include realistic situations and relatable moments
- Add depth through storytelling, examples, and emotional connection

Return the expanded version in this exact format:
HOOK: [expanded hook with 2-3 sentences]
BODY: [expanded body with 4-6 paragraphs, 400-500 words total]
CTA: [strengthened call-to-action with 2-3 sentences]`;

        try {
          const rephraseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  content: `You are an expert social media copywriter specializing in creating longer, more contextual content that resonates deeply with "${targetAudience}" using a "${tone}" tone. Focus on rich storytelling, specific examples, and emotional connection while maintaining authenticity and engagement.`
                },
                {
                  role: 'user',
                  content: rephrasePrompt
                }
              ],
              temperature: 0.8,
              max_tokens: 1500,
              top_p: 1,
              frequency_penalty: 0.3,
              presence_penalty: 0.3
            })
          });

          if (rephraseResponse.ok) {
            const rephraseData = await rephraseResponse.json();
            const rephrasedContent = rephraseData.choices[0].message.content;
            
            console.log('Rephrased content:', rephrasedContent);
            
            // Parse the rephrased content
            const lines = rephrasedContent.split('\n').filter(line => line.trim());
            
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
            
            console.log('Parsed rephrased content:', { hook, body, cta });
          } else {
            console.log('Rephrasing failed, using original template');
            // Fallback to original template
            hook = selectedPrompt.hook || '';
            body = selectedPrompt.body || '';
            cta = selectedPrompt.cta || '';
          }
        } catch (rephraseError) {
          console.error('Error rephrasing content:', rephraseError);
          console.log('Using original template as fallback');
          // Fallback to original template
          hook = selectedPrompt.hook || '';
          body = selectedPrompt.body || '';
          cta = selectedPrompt.cta || '';
        }
      }
    }

    // If no prompts found, generate completely new longer content with AI
    if (!hook && !body && !cta) {
      console.log('No prompts found, generating new longer content with OpenAI');
      
      const generationPrompt = `You are an expert social media copywriter specializing in home care services. Create longer, more contextual social media content.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${targetAudience}
Tone: ${tone}
Platform: ${platform}

Create a comprehensive social media post (500-600 words) that is specifically tailored to:
- Target Audience: "${targetAudience}" - speak directly to their needs, concerns, and interests
- Tone: "${tone}" - maintain this exact tone throughout
- Content Type: "${postType}" - ensure the content serves this specific purpose
- Platform: "${platform}" - optimize for this platform's best practices and audience behavior

Structure the post with:

1. HOOK (2-3 compelling sentences): 
   - Create an attention-grabbing opening that immediately resonates with "${targetAudience}"
   - Use a story, question, or insight that stops them scrolling
   - Build curiosity and emotional connection from the first sentence

2. BODY (4-6 substantial paragraphs, 400-450 words):
   - Tell a relatable story or share valuable insights with specific details
   - Address concrete challenges "${targetAudience}" faces with real examples
   - Demonstrate expertise through detailed scenarios and outcomes
   - Show concrete benefits and transformation stories
   - Include emotional moments and authentic experiences
   - Add context about common situations and realistic solutions
   - Use "${tone}" tone while being conversational and engaging
   - Weave in credibility indicators and social proof naturally
   - Create vivid mental pictures with descriptive language

3. CTA (2-3 sentences):
   - Compelling call-to-action that drives "${targetAudience}" to meaningful action
   - Include emotional motivation and clear next steps
   - Add reassurance or secondary benefit to reduce hesitation

Make it authentic, highly relevant, contextual, and platform-optimized for ${platform}. Focus on deep storytelling, emotional connection, and providing substantial value through detailed examples and scenarios.

Format your response as:
HOOK: [compelling hook content with 2-3 sentences]
BODY: [detailed, valuable body content in 4-6 paragraphs]
CTA: [strong call-to-action with 2-3 sentences]`;

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
                content: `You are an expert social media copywriter specializing in home care services. Create compelling, longer-form content that truly resonates with the target audience "${targetAudience}" with a "${tone}" tone for "${postType}" content on "${platform}". Focus on detailed storytelling, emotional connection, and providing substantial value through specific examples and scenarios.`
              },
              {
                role: 'user',
                content: generationPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1800
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI API error:', errorData);
          throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const generatedContent = data.choices[0].message.content;
        console.log('Generated content:', generatedContent);

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
            body = contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we're here to help navigate those difficult decisions with expertise and understanding.';
            cta = contentLines[contentLines.length - 1] || 'Contact us today to learn more about how we can support your family!';
          } else {
            hook = 'Looking for reliable home care services?';
            body = 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we're here to help navigate those difficult decisions with expertise and understanding.';
            cta = 'Contact us today to learn more about how we can support your family!';
          }
        }
      } catch (error) {
        console.error('Error generating content:', error);
        // Ultimate fallback
        hook = 'Looking for reliable home care services?';
        body = 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we're here to help navigate those difficult decisions with expertise and understanding.';
        cta = 'Contact us today to learn more about how we can support your family!';
      }
    }

    // Personalize the content with business context
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

    // Personalize all content sections
    hook = personalizeText(hook);
    body = personalizeText(body);
    cta = personalizeText(cta);

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
      source: selectedPrompt ? 'database_rephrased' : 'ai_generated',
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
