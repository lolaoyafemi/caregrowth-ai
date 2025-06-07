import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, postType, tone, platform } = await req.json();

    if (!openAIApiKey) throw new Error('Missing OpenAI API Key');
    if (!userId || !postType || !tone || !platform) throw new Error('Missing required fields');

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) throw new Error('User profile not found.');

    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('category', postType)
      .eq('platform', platform)
      .limit(1)
      .maybeSingle();

    if (promptError || !prompt) throw new Error(`No prompt found for category "${postType}" and platform "${platform}"`);

    const filledPrompt = `
Create a ${postType} post for the following business:

Business: ${profile.business_name}
Location: ${profile.location}
Service: ${profile.core_service || profile.services}
Audience: ${profile.ideal_client}
Offer: ${profile.main_offer}
Promise: ${profile.big_promise}
Problems: ${profile.audience_problems || profile.pain_points?.join(', ')}
Objections: ${profile.objections?.join(', ')}
Differentiator: ${profile.differentiator}

---
HOOK: ${prompt.hook}
BODY: ${prompt.body}
CTA: ${prompt.cta}
TONE: ${tone}
---
Please return the full post (hook, body, cta) as one single paragraph for platform: ${platform}.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a content strategist for social media marketing.' },
          { role: 'user', content: filledPrompt }
        ],
        temperature: 0.75,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API Error');
    }

    const ai = await response.json();
    const content = ai.choices?.[0]?.message?.content;

    if (!content) throw new Error('OpenAI did not return a message.');

    return new Response(JSON.stringify({ post: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[generate-post] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
