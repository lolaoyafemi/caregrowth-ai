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

    // Get prompt templates for the specified content type and platform
    const { data: prompts, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('category', postType)
      .in('platform', [platform, 'all']);

    console.log('Fetched prompts:', prompts);

    if (promptError) {
      console.error('Prompt fetch error:', promptError);
    }

    let selectedPrompt = null;
    if (prompts && prompts.length > 0) {
      // Prefer platform-specific prompts, then fall back to 'all' platform prompts
      selectedPrompt = prompts.find(p => p.platform === platform) || 
                      prompts.find(p => p.platform === 'all') || 
                      prompts[0];
    }

    console.log('Selected prompt:', selectedPrompt);

    // Enhanced function to parse arrays from prompt templates
    const parsePromptArray = (text) => {
      if (!text || typeof text !== 'string') return [];
      
      try {
        // Handle different possible formats:
        // 1. JSON array format: ["item1", "item2", "item3"]
        if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
          return JSON.parse(text);
        }
        
        // 2. Comma-separated quoted strings: "item1", "item2", "item3"
        // Split by comma and clean up quotes and whitespace
        return text.split(',')
          .map(item => item.trim())
          .map(item => {
            // Remove surrounding quotes (single or double)
            return item.replace(/^["']|["']$/g, '');
          })
          .filter(item => item.length > 0); // Remove empty items
      } catch (error) {
        console.error('Error parsing prompt array:', error, 'Text:', text);
        return [];
      }
    };

    let hook = '', body = '', cta = '';
    let useTemplate = false;

    if (selectedPrompt) {
      console.log('Raw prompt data:', {
        hook: selectedPrompt.hook,
        body: selectedPrompt.body,
        cta: selectedPrompt.cta
      });

      // Parse the prompt template arrays
      const hookOptions = parsePromptArray(selectedPrompt.hook);
      const bodyOptions = parsePromptArray(selectedPrompt.body);
      const ctaOptions = parsePromptArray(selectedPrompt.cta);

      console.log('Parsed options:', {
        hookOptions,
        bodyOptions,
        ctaOptions
      });

      // Check if we have valid options
      if (hookOptions.length > 0 && bodyOptions.length > 0 && ctaOptions.length > 0) {
        // Randomly select from available options
        hook = hookOptions[Math.floor(Math.random() * hookOptions.length)];
        body = bodyOptions[Math.floor(Math.random() * bodyOptions.length)];
        cta = ctaOptions[Math.floor(Math.random() * ctaOptions.length)];

        console.log('Selected templates:', { hook, body, cta });
        useTemplate = true;
      } else {
        console.log('Invalid or empty template options, falling back to AI generation');
      }
    }

    // If no valid prompts found or empty templates, use AI generation
    if (!useTemplate || !hook || !body || !cta) {
      console.log('Using OpenAI fallback generation');
      
      const businessContext = profile ? `
Business Name: ${profile.business_name || 'Home Care Business'}
Services: ${profile.services || profile.core_service || 'Home care services'}
Location: ${profile.location || 'Local area'}
Target Client: ${profile.ideal_client || 'Families needing care'}
Main Offer: ${profile.main_offer || 'Professional home care'}
Differentiator: ${profile.differentiator || 'Compassionate, professional care'}
` : 'Home Care Business providing professional care services';

      const systemMessage = `You are an expert social media copywriter specializing in home care services. 
Create engaging, authentic social media content that converts prospects into customers.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${audience || "families caring for loved ones"}
Tone: ${tone}
Platform: ${platform}

Create a social media post with these components:
1. HOOK: An attention-grabbing opening line that stops scrolling (1-2 sentences)
2. BODY: Main content that provides value, builds trust, or educates (2-3 sentences)
3. CTA: A clear call-to-action that drives engagement or leads (1 sentence)

Guidelines:
- Write in ${tone} tone
- Target ${audience || "families caring for loved ones"}
- Focus on ${postType} content
- Make it platform-appropriate for ${platform}
- Sound human and authentic, not AI-generated
- Include relevant emotions and pain points
- End with a clear, actionable CTA

Format your response as:
HOOK: [hook content]
BODY: [body content]  
CTA: [cta content]`;

      console.log('Calling OpenAI API...');
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
              content: `Create a ${postType} social media post for ${platform} targeting ${audience} in a ${tone} tone.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
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
    } else {
      // Personalize templates with business context
      const personalizeText = (text) => {
        if (!profile || !text) return text;
        
        return text
          .replace(/\[business_name\]/gi, profile.business_name || 'our business')
          .replace(/\[location\]/gi, profile.location || 'your area')
          .replace(/\[service\]/gi, profile.services || profile.core_service || 'our services')
          .replace(/\[differentiator\]/gi, profile.differentiator || 'professional care')
          .replace(/\[audience\]/gi, audience || 'families')
          .replace(/\[main_offer\]/gi, profile.main_offer || 'our services')
          .replace(/\[ideal_client\]/gi, profile.ideal_client || 'families');
      };

      hook = personalizeText(hook);
      body = personalizeText(body);
      cta = personalizeText(cta);

      console.log('Personalized templates:', { hook, body, cta });
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
        content: finalPost,
        used_template: useTemplate
      }]);

    if (insertError) {
      console.error('Error inserting to post_history:', insertError);
    }

    return new Response(JSON.stringify({
      post: finalPost,
      hook,
      body,
      cta,
      source: useTemplate ? 'template' : 'ai_generated'
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



// import "https://deno.land/x/xhr@0.1.0/mod.ts";
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
// import { corsHeaders } from '../_shared/cors.ts';

// const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
// const supabaseUrl = Deno.env.get('SUPABASE_URL');
// const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     const { userId, postType, tone, platform, audience } = await req.json();

//     console.log('Generate post request:', { userId, postType, tone, platform, audience });

//     if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
//       console.error('Missing environment variables');
//       throw new Error('Missing environment variables');
//     }

//     if (!userId || !postType || !tone) {
//       throw new Error('Missing required parameters: userId, postType, or tone');
//     }

//     const supabase = createClient(supabaseUrl, supabaseServiceKey);

//     // Get user profile to understand their business
//     const { data: profile, error: profileError } = await supabase
//       .from('user_profiles')
//       .select('*')
//       .eq('user_id', userId)
//       .single();

//     if (profileError || !profile) {
//       console.error('Profile error:', profileError);
//     }

//     // Get prompt templates for the specified content type and platform
//     const { data: prompts, error: promptError } = await supabase
//       .from('prompts')
//       .select('*')
//       .eq('category', postType)
//       .in('platform', [platform, 'all']);

//     console.log('Fetched prompts:', prompts);

//     let selectedPrompt = null;
//     if (prompts && prompts.length > 0) {
//       // Prefer platform-specific prompts, then fall back to 'all' platform prompts
//       selectedPrompt = prompts.find(p => p.platform === platform) || prompts.find(p => p.platform === 'all') || prompts[0];
//     }

//     console.log('Selected prompt:', selectedPrompt);

//     // Parse arrays from the prompt templates (they are stored as comma-separated strings in quotes)
//     const parsePromptArray = (text: string): string[] => {
//       if (!text) return [];
//       // Split by comma and clean up quotes and whitespace
//       return text.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
//     };

//     let hook = '', body = '', cta = '';

//     if (selectedPrompt) {
//       // Parse the prompt template arrays
//       const hookOptions = parsePromptArray(selectedPrompt.hook);
//       const bodyOptions = parsePromptArray(selectedPrompt.body);
//       const ctaOptions = parsePromptArray(selectedPrompt.cta);

//       // Randomly select from available options
//       hook = hookOptions[Math.floor(Math.random() * hookOptions.length)] || '';
//       body = bodyOptions[Math.floor(Math.random() * bodyOptions.length)] || '';
//       cta = ctaOptions[Math.floor(Math.random() * ctaOptions.length)] || '';

//       console.log('Selected templates:', { hook, body, cta });
//     }

//     // If no prompts found or empty templates, use fallback generation
//     if (!hook || !body || !cta) {
//       console.log('Using OpenAI fallback generation');

//       const businessContext = profile ? `
// Business Name: ${profile.business_name || 'Home Care Business'}
// Services: ${profile.services || profile.core_service || 'Home care services'}
// Location: ${profile.location || 'Local area'}
// Target Client: ${profile.ideal_client || 'Families needing care'}
// Main Offer: ${profile.main_offer || 'Professional home care'}
// Differentiator: ${profile.differentiator || 'Compassionate, professional care'}
// ` : 'Home Care Business providing professional care services';

//       const systemMessage = `You are an expert social media copywriter specializing in home care services. 
// Create engaging, authentic social media content that converts prospects into customers.

// Business Context:
// ${businessContext}

// Content Category: ${postType}
// Target Audience: ${audience || "families caring for loved ones"}
// Tone: ${tone}
// Platform: ${platform}

// Create a social media post with these components:
// 1. HOOK: An attention-grabbing opening line that stops scrolling (1-2 sentences)
// 2. BODY: Main content that provides value, builds trust, or educates (2-3 sentences)
// 3. CTA: A clear call-to-action that drives engagement or leads (1 sentence)

// Guidelines:
// - Write in ${tone} tone
// - Target ${audience || "families caring for loved ones"}
// - Focus on ${postType} content
// - Make it platform-appropriate for ${platform}
// - Sound human and authentic, not AI-generated
// - Include relevant emotions and pain points
// - End with a clear, actionable CTA

// Format your response as:
// HOOK: [hook content]
// BODY: [body content]  
// CTA: [cta content]`;

//       console.log('Calling OpenAI API...');

//       const response = await fetch('https://api.openai.com/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${openAIApiKey}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           model: 'gpt-4o-mini',
//           messages: [
//             { role: 'system', content: systemMessage },
//             { role: 'user', content: `Create a ${postType} social media post for ${platform} targeting ${audience} in a ${tone} tone.` }
//           ],
//           temperature: 0.7,
//           max_tokens: 500
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         console.error('OpenAI API error:', errorData);
//         throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
//       }

//       const data = await response.json();
//       const generatedContent = data.choices[0].message.content;

//       console.log('Generated content:', generatedContent);

//       // Parse the generated content to extract hook, body, and cta
//       try {
//         const lines = generatedContent.split('\n').filter(line => line.trim());
        
//         for (const line of lines) {
//           if (line.toLowerCase().startsWith('hook:')) {
//             hook = line.substring(5).trim();
//           } else if (line.toLowerCase().startsWith('body:')) {
//             body = line.substring(5).trim();
//           } else if (line.toLowerCase().startsWith('cta:')) {
//             cta = line.substring(4).trim();
//           }
//         }
        
//         // If parsing fails, use the entire content as body
//         if (!hook && !body && !cta) {
//           const contentLines = generatedContent.split('\n').filter(line => line.trim());
//           hook = contentLines[0] || 'Are you looking for reliable home care services?';
//           body = contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones.';
//           cta = contentLines[contentLines.length - 1] || 'Contact us today to learn more!';
//         }
//       } catch (parseError) {
//         console.error('Error parsing generated content:', parseError);
//         // Fallback content
//         hook = 'Are you looking for reliable home care services?';
//         body = 'Our team provides compassionate, professional care for your loved ones.';
//         cta = 'Contact us today to learn more!';
//       }
//     } else {
//       // If we have templates, personalize them with business context
//       if (profile) {
//         const personalizeText = (text: string): string => {
//           return text
//             .replace(/\[business_name\]/gi, profile.business_name || 'our business')
//             .replace(/\[location\]/gi, profile.location || 'your area')
//             .replace(/\[service\]/gi, profile.services || profile.core_service || 'our services')
//             .replace(/\[differentiator\]/gi, profile.differentiator || 'professional care')
//             .replace(/\[audience\]/gi, audience || 'families');
//         };

//         hook = personalizeText(hook);
//         body = personalizeText(body);
//         cta = personalizeText(cta);
//       }
//     }

//     const finalPost = `${hook}\n\n${body}\n\n${cta}`;

//     // Log post to post_history
//     const { error: insertError } = await supabase.from('post_history').insert([
//       {
//         user_id: userId,
//         prompt_category: postType,
//         tone,
//         platform,
//         content: finalPost
//       }
//     ]);

//     if (insertError) {
//       console.error('Error inserting to post_history:', insertError);
//     }

//     return new Response(JSON.stringify({ 
//       post: finalPost,
//       hook,
//       body,
//       cta
//     }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });

//   } catch (error) {
//     console.error('Error in generate-post function:', error);
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });
//   }
// });
