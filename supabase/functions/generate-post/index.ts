
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      // Create a basic profile if none exists
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert([{ user_id: userId, business_name: 'Home Care Business' }]);
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
      }
    }

    // Get random prompt row from prompts table
    const { data: promptRow, error: promptError } = await supabase
      .from('prompts')
      .select('hook, body, cta')
      .eq('category', postType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (promptError || !promptRow) {
      console.error('Prompt error:', promptError);
      // Fallback content if no prompts found
      const fallbackContent = {
        hook: '["Are you struggling with daily care challenges?", "Feeling overwhelmed with caregiving responsibilities?", "Looking for reliable home care support?"]',
        body: '["Our experienced team understands the unique challenges families face when caring for loved ones. We provide compassionate, professional care that gives you peace of mind.", "Every family deserves quality care. Our certified caregivers are trained to handle everything from daily assistance to specialized care needs."]',
        cta: '["Contact us today for a free consultation!", "Let us help you find the perfect care solution.", "Call now to learn more about our services!"]'
      };
      promptRow = fallbackContent;
    }

    let hookArray, bodyArray, ctaArray;
    try {
      hookArray = JSON.parse(promptRow.hook);
      bodyArray = JSON.parse(promptRow.body);
      ctaArray = JSON.parse(promptRow.cta);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback if JSON parsing fails
      hookArray = ["Are you looking for reliable home care services?"];
      bodyArray = ["Our team provides compassionate, professional care for your loved ones."];
      ctaArray = ["Contact us today to learn more!"];
    }

    const systemMessage = `
You are a warm, emotionally intelligent copywriter helping a home care agency create original social media posts that feel human, not AI-written.

You are given:
- A JSON array of possible hooks
- A JSON array of possible body paragraphs
- A JSON array of possible CTAs
- Target audience: ${audience || "families caring for loved ones"}

Randomly select ONE item from each array.  
Assemble a full post using this format:

Hook
Body
CTA

Use the tone: ${tone} and write for the platform: ${platform}. 
Speak directly to ${audience || "families caring for loved ones"}.

Don't label anything.  
Don't include headings.  
Return just the post — no bullets, no explanation.

Sound like a real person. Slightly bold. Clear. No fluff.
    `.trim();

    const userMessage = JSON.stringify({
      hook: hookArray,
      body: bodyArray,
      cta: ctaArray,
      tone,
      platform,
      audience: audience || "families caring for loved ones"
    });

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedPost = data.choices[0].message.content;

    console.log('Generated post:', generatedPost);

    // Log post to post_history
    const { error: insertError } = await supabase.from('post_history').insert([
      {
        user_id: userId,
        prompt_category: postType,
        tone,
        platform,
        content: generatedPost
      }
    ]);

    if (insertError) {
      console.error('Error inserting to post_history:', insertError);
    }

    return new Response(JSON.stringify({ post: generatedPost }), {
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
