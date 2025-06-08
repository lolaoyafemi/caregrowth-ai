
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, postType, tone, platform, audience } = await req.json();

    console.log('Generate post request:', { userId, postType, tone, platform, audience });

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

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
    }

    // Create a comprehensive prompt for OpenAI
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Create a ${postType} social media post for ${platform} targeting ${audience} in a ${tone} tone.` }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
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
    let hook = '', body = '', cta = '';
    
    try {
      const lines = generatedContent.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('hook:')) {
          hook = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('body:')) {
          body = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('cta:')) {
          cta = line.substring(4).trim();
        }
      }
      
      // If parsing fails, use the entire content as body
      if (!hook && !body && !cta) {
        const contentLines = generatedContent.split('\n').filter(line => line.trim());
        hook = contentLines[0] || 'Are you looking for reliable home care services?';
        body = contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones.';
        cta = contentLines[contentLines.length - 1] || 'Contact us today to learn more!';
      }
    } catch (parseError) {
      console.error('Error parsing generated content:', parseError);
      // Fallback content
      hook = 'Are you looking for reliable home care services?';
      body = 'Our team provides compassionate, professional care for your loved ones.';
      cta = 'Contact us today to learn more!';
    }

    const finalPost = `${hook}\n\n${body}\n\n${cta}`;

    // Log post to post_history
    const { error: insertError } = await supabase.from('post_history').insert([
      {
        user_id: userId,
        prompt_category: postType,
        tone,
        platform,
        content: finalPost
      }
    ]);

    if (insertError) {
      console.error('Error inserting to post_history:', insertError);
    }

    return new Response(JSON.stringify({ 
      post: finalPost,
      hook,
      body,
      cta
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-post function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
