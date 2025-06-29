
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
        const rephrasePrompt = `You are an expert social media storyteller specializing in creating emotionally compelling, longer-form content that deeply resonates with specific audiences. I have a content template that needs to be transformed into a rich, storytelling masterpiece.

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

Transform this template into a captivating story by:

1. CREATING A COMPELLING NARRATIVE HOOK (3-4 sentences):
   - Start with a specific, relatable scenario that "${targetAudience}" immediately recognizes
   - Use vivid imagery and emotional language that creates an instant connection
   - Include concrete details that paint a clear picture in the reader's mind
   - Ask a thought-provoking question or share a surprising insight

2. DEVELOPING A RICH STORYTELLING BODY (500-600 words across 6-8 paragraphs):
   - Tell a complete story with a clear beginning, middle, and emotional resolution
   - Include specific, realistic scenarios with names, ages, and detailed situations
   - Paint vivid pictures of before/after transformations
   - Share authentic moments of struggle, breakthrough, and relief
   - Use sensory details (what people see, hear, feel) to make scenes come alive
   - Include specific dialogue or quotes that sound genuine and relatable
   - Address real fears, hopes, and desires of "${targetAudience}"
   - Weave in social proof through storytelling rather than direct testimonials
   - Show the human side of care through specific examples and moments
   - Create emotional peaks and valleys that keep readers engaged
   - Use transition phrases that guide readers smoothly through the narrative

3. CRAFTING AN INSPIRING CALL-TO-ACTION (3-4 sentences):
   - Connect directly to the emotional journey you've just shared
   - Offer hope and a clear next step that feels natural and non-pressured
   - Include reassurance and remove barriers to taking action
   - End with warmth and invitation rather than hard selling

STORYTELLING REQUIREMENTS:
- Create a cohesive narrative arc that feels like a complete story
- Use specific examples: "Sarah, a 62-year-old daughter caring for her father with Alzheimer's..."
- Include emotional moments: describe feelings, concerns, relief, joy
- Paint scenes with sensory details: "the quiet morning routine," "gentle hands," "peaceful smile"
- Show real-life situations and transformations
- Use conversational, warm language with a "${tone}" tone
- Make it feel personal and intimate while being professional
- Include realistic timeframes and specific outcomes
- Address common objections naturally within the story
- Create multiple emotional connection points throughout
- Keep placeholders like {business_name}, {ideal_client}, etc. intact
- Ensure high relevance to "${targetAudience}" with authentic scenarios

Return the enhanced storytelling version in this exact format:
HOOK: [compelling narrative hook with 3-4 sentences]
BODY: [rich storytelling body with 500-600 words across 6-8 paragraphs]
CTA: [inspiring call-to-action with 3-4 sentences]`;

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
                  content: `You are a master storyteller specializing in creating emotionally compelling social media content for "${targetAudience}". You excel at transforming basic templates into rich, engaging narratives that create deep emotional connections and inspire action through authentic storytelling.`
                },
                {
                  role: 'user',
                  content: rephrasePrompt
                }
              ],
              temperature: 0.8,
              max_tokens: 2000,
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

    // If no prompts found, generate completely new storytelling content with AI
    if (!hook && !body && !cta) {
      console.log('No prompts found, generating new storytelling content with OpenAI');
      
      const generationPrompt = `You are a master storyteller and social media expert specializing in home care services. Create compelling, story-driven social media content that deeply connects with the target audience.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${targetAudience}
Tone: ${tone}
Platform: ${platform}

Create a comprehensive, story-driven social media post (550-650 words) that:

STORYTELLING APPROACH:
- Tell a complete, engaging story with characters, conflict, and resolution
- Use specific, realistic scenarios with detailed context
- Include authentic dialogue and genuine emotional moments
- Paint vivid scenes that readers can visualize clearly
- Address real challenges "${targetAudience}" faces through narrative
- Show transformation and hope through storytelling
- Create multiple emotional connection points throughout

NARRATIVE STRUCTURE:

1. COMPELLING STORY HOOK (3-4 sentences):
   - Open with a specific, relatable scenario
   - Use vivid, sensory language that immediately engages
   - Create instant emotional connection with "${targetAudience}"
   - Include a compelling question or surprising insight

2. RICH STORYTELLING BODY (500-550 words across 6-8 paragraphs):
   - Develop a complete narrative arc with clear progression
   - Include specific characters with names, ages, and backgrounds
   - Show real struggles, emotions, and breakthrough moments
   - Use dialogue and quoted thoughts to add authenticity
   - Paint detailed scenes with sensory descriptions
   - Address common fears and hopes through the story
   - Demonstrate expertise through narrative examples
   - Show before/after transformations with specific details
   - Include realistic timeframes and outcomes
   - Weave in social proof naturally through storytelling
   - Use smooth transitions between scenes and ideas

3. INSPIRING CALL-TO-ACTION (3-4 sentences):
   - Connect emotionally to the story just shared
   - Offer clear, achievable next steps
   - Remove barriers and provide reassurance
   - End with warmth and genuine invitation

CONTENT REQUIREMENTS:
- Create authentic, relatable scenarios for "${targetAudience}"
- Use "${tone}" tone while maintaining warmth and professionalism
- Include specific, realistic examples and outcomes
- Address emotional needs and practical concerns
- Optimize for ${platform} engagement with platform-appropriate language
- Show genuine care and understanding throughout
- Use storytelling to educate and inspire rather than just sell

Format your response as:
HOOK: [compelling story hook with 3-4 sentences]
BODY: [rich storytelling content with 500-550 words across 6-8 paragraphs]
CTA: [inspiring call-to-action with 3-4 sentences]`;

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
                content: `You are a master storyteller specializing in emotionally compelling home care content. Create rich, engaging narratives that deeply resonate with "${targetAudience}" using authentic storytelling, specific examples, and genuine emotional connection.`
              },
              {
                role: 'user',
                content: generationPrompt
              }
            ],
            temperature: 0.8,
            max_tokens: 2200
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
            body = contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we are here to help navigate those difficult decisions with expertise and understanding.';
            cta = contentLines[contentLines.length - 1] || 'Contact us today to learn more about how we can support your family!';
          } else {
            hook = 'Looking for reliable home care services?';
            body = 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we are here to help navigate those difficult decisions with expertise and understanding.';
            cta = 'Contact us today to learn more about how we can support your family!';
          }
        }
      } catch (error) {
        console.error('Error generating content:', error);
        // Ultimate fallback
        hook = 'Looking for reliable home care services?';
        body = 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we are here to help navigate those difficult decisions with expertise and understanding.';
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
