
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
    let useTemplate = false;
    let selectedPrompt = null;

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
        
        // Use the hook, body, and cta directly from the selected row
        if (selectedPrompt.hook && selectedPrompt.body && selectedPrompt.cta) {
          hook = selectedPrompt.hook;
          body = selectedPrompt.body;
          cta = selectedPrompt.cta;
          useTemplate = true;
          
          console.log('Using template from row:', { hook, body, cta });
        } else {
          console.log('Selected prompt row has missing fields, falling back to AI generation');
        }
      } else {
        console.log('No suitable prompts found for category and platform, falling back to AI generation');
      }
    } else {
      console.log('No prompts found for category:', postType);
    }

    // Build comprehensive business context
    const businessContext = profile ? `
Business Name: ${profile.business_name || 'Home Care Business'}
Services: ${profile.services || profile.core_service || 'Home care services'}
Location: ${profile.location || 'Local area'}
Target Client: ${profile.ideal_client || 'Families needing care'}
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
        .replace(/\{ideal_client\}/gi, profile.ideal_client || 'families')
        .replace(/\{main_offer\}/gi, profile.main_offer || 'our services')
        .replace(/\{differentiator\}/gi, profile.differentiator || 'professional care')
        .replace(/\{big_promise\}/gi, profile.big_promise || 'exceptional care')
        .replace(/\{pain_points\}/gi, Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : 'common challenges')
        .replace(/\{audience_problem\}/gi, profile.audience_problem || 'caregiving challenges')
        .replace(/\{objections\}/gi, Array.isArray(profile.objections) ? profile.objections.join(', ') : 'common concerns')
        .replace(/\{audience\}/gi, audience || 'families')
        .replace(/\{tone\}/gi, tone || 'professional')
        .replace(/\{platform\}/gi, platform || 'social media')
        .replace(/\{testimonial\}/gi, profile.testimonial || 'trusted by our community');
    };

    // If template found, personalize it but also enhance with AI
    if (useTemplate && hook && body && cta) {
      // Personalize the template
      hook = personalizeText(hook);
      body = personalizeText(body);
      cta = personalizeText(cta);

      // Enhance with AI for better personalization and intelligence
      console.log('Enhancing template with AI intelligence...');
      
      const enhancementPrompt = `You are an expert social media copywriter. I have a templated social media post that needs to be enhanced and personalized for a specific business.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${audience || "families caring for loved ones"}
Tone: ${tone}
Platform: ${platform}

Current Template:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Please enhance this content by:
1. Making it more personalized to the business details
2. Adding emotional intelligence and human touch
3. Making it more engaging and compelling
4. Ensuring it sounds natural and authentic
5. Keeping the same structure but improving the language and impact

Return the enhanced version in the same format:
HOOK: [enhanced hook]
BODY: [enhanced body]
CTA: [enhanced cta]`;

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
                content: 'You are an expert social media copywriter specializing in home care services. Focus on creating authentic, engaging content that builds trust and drives action.'
              },
              {
                role: 'user',
                content: enhancementPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 600
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
          
          console.log('Enhanced content:', { hook, body, cta });
        } else {
          console.log('Enhancement failed, using personalized template');
        }
      } catch (enhanceError) {
        console.error('Error enhancing template:', enhanceError);
        console.log('Using personalized template without AI enhancement');
      }
    } else {
      // Full AI generation with enhanced business intelligence
      console.log('Using full OpenAI generation with business intelligence');
      
      const systemMessage = `You are an expert social media copywriter specializing in home care services. 
Create engaging, authentic social media content that converts prospects into customers using advanced business intelligence.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${audience || "families caring for loved ones"}
Tone: ${tone}
Platform: ${platform}

Create a highly personalized social media post with these components:
1. HOOK: An attention-grabbing opening that speaks directly to the target audience's pain points and emotions (1-2 sentences)
2. BODY: Value-driven content that showcases the business's unique strengths and addresses specific client needs (2-3 sentences)
3. CTA: A compelling call-to-action that drives engagement and leads (1 sentence)

Advanced Guidelines:
- Use the business's specific differentiators and unique value proposition
- Address the exact pain points and objections mentioned in the business profile
- Incorporate the location and services naturally
- Make it sound authentically human, not AI-generated
- Use emotional intelligence to connect with the target audience
- Include social proof elements when relevant
- Optimize for ${platform} platform best practices
- Write in ${tone} tone while maintaining authenticity

Format your response as:
HOOK: [hook content]
BODY: [body content]  
CTA: [cta content]`;

      console.log('Calling OpenAI API with enhanced intelligence...');
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
              content: systemMessage
            },
            {
              role: 'user',
              content: `Create an intelligent, personalized ${postType} social media post for ${platform} targeting ${audience} in a ${tone} tone using all the business context provided.`
            }
          ],
          temperature: 0.7,
          max_tokens: 600
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

      // Parse the generated content to extract hook, body, and cta
      try {
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

        // If parsing fails, use fallback parsing
        if (!hook && !body && !cta) {
          const contentLines = generatedContent.split('\n').filter(line => line.trim());
          if (contentLines.length >= 3) {
            hook = contentLines[0] || 'Are you looking for reliable home care services?';
            body = contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones.';
            cta = contentLines[contentLines.length - 1] || 'Contact us today to learn more!';
          } else {
            // Ultimate fallback
            hook = 'Are you looking for reliable home care services?';
            body = 'Our team provides compassionate, professional care for your loved ones.';
            cta = 'Contact us today to learn more!';
          }
        }
      } catch (parseError) {
        console.error('Error parsing generated content:', parseError);
        // Fallback content
        hook = 'Are you looking for reliable home care services?';
        body = 'Our team provides compassionate, professional care for your loved ones.';
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
        audience,
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
      source: useTemplate ? 'template_enhanced' : 'ai_generated',
      template_id: selectedPrompt?.id || null,
      available_templates: prompts?.length || 0,
      business_context_used: !!profile
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
