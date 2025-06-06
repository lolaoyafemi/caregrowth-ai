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
    const { userId, postType, tone, platform } = await req.json();

    if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get user profile (used later if needed)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found. Please fill out your business details first.');
    }

    // 2. Get random prompt row from `prompts` table
    const { data: promptRow, error: promptError } = await supabase
      .from('prompts')
      .select('hook, body, cta')
      .eq('category', postType)
      .order('RANDOM()', { ascending: false })
      .limit(1)
      .single();

    if (promptError || !promptRow) {
      throw new Error('Prompt not found.');
    }

    const hookArray = JSON.parse(promptRow.hook);
    const bodyArray = JSON.parse(promptRow.body);
    const ctaArray = JSON.parse(promptRow.cta);

    const systemMessage = `
You are a warm, emotionally intelligent copywriter helping a home care agency create original social media posts that feel human, not AI-written.

You are given:
- A JSON array of possible hooks
- A JSON array of possible body paragraphs
- A JSON array of possible CTAs

Randomly select ONE item from each array.  
Assemble a full post using this format:

→ Hook  
→ Body  
→ CTA

Use the tone provided (e.g. ${tone}) and write for the specified platform (e.g. ${platform}). Speak directly to the audience (e.g. "families caring for loved ones with dementia").

Don’t label anything.  
Don’t include headings.  
Return just the post — no bullets, no explanation.

Sound like a real person. Slightly bold. Clear. No fluff.
    `.trim();

    const userMessage = JSON.stringify({
      hook: hookArray,
      body: bodyArray,
      cta: ctaArray,
      tone,
      platform,
      audience: "families caring for loved ones with dementia"
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedPost = data.choices[0].message.content;

    // 3. Log post to post_history
await supabase.from('post_history').insert([
  {
    user_id: userId,
    prompt_category: postType,
    tone,
    platform,
    content: generatedPost
  }
]);

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
