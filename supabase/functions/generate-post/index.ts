
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, postType, tone, platform } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      throw new Error('User profile not found. Please fill out your business details first.');
    }

    // Strategy mapping for different post types
    const strategyMap: Record<string, string> = {
      "trust-authority": "Build credibility and establish expertise in home care. Share professional insights, certifications, years of experience, or industry knowledge that positions the agency as a trusted authority.",
      "heartfelt-relatable": "Share emotional stories that connect with families. Focus on real moments, personal experiences, or touching stories that show the human side of home care and resonate with families facing similar situations.",
      "educational-helpful": "Teach something useful about home care. Provide practical tips, answer common questions, or share valuable information that helps families navigate home care decisions or improve their loved one's care.",
      "results-offers": "Highlight results and present compelling offers. Showcase successful outcomes, client transformations, or present special services/packages in a way that demonstrates clear value and encourages action."
    };

    const strategy = strategyMap[postType] || "";

    // Platform-specific instructions
    const platformInstructions: Record<string, string> = {
      "facebook": "Write for Facebook with a warm, community-focused tone. Use 1-2 paragraphs with natural line breaks. Include relevant emojis sparingly.",
      "twitter": "Write for Twitter/X with concise, impactful messaging. Keep under 280 characters. Use 1-2 relevant hashtags.",
      "linkedin": "Write for LinkedIn with a professional tone. Focus on industry insights and business value. Use 2-3 short paragraphs.",
      "instagram": "Write for Instagram with a visual-first approach. Include relevant hashtags and emoji. Write in a casual, authentic voice.",
      "all": "Write versatile content suitable for multiple platforms. Keep it engaging yet professional."
    };

    const platformGuide = platformInstructions[platform] || platformInstructions["all"];

    const prompt = `
Write a ${postType} social media post for a home care agency.

BUSINESS CONTEXT:
Business Name: ${profile.business_name}
Location: ${profile.location}
Core Service: ${profile.core_service || profile.services}
Ideal Client: ${profile.ideal_client}
Main Offer: ${profile.main_offer}
Big Promise: ${profile.big_promise}
Pain Points: ${profile.audience_problems || profile.pain_points?.join(', ')}
Objections: ${profile.objections?.join(', ')}
Differentiator: ${profile.differentiator}
Testimonial: ${profile.testimonial || ''}

CONTENT STRATEGY: ${strategy}

PLATFORM: ${platform}
TONE: ${tone}
PLATFORM GUIDELINES: ${platformGuide}

STRUCTURE REQUIREMENTS:
1. Hook – Short, emotional or curiosity-based opening line that stops the scroll
2. Body – One key insight, story, tip, or value proposition that connects with the audience
3. Soft CTA – Gentle call-to-action like "comment below," "DM us," or "learn more"

GUIDELINES:
- Keep under 150 words for most platforms (under 50 for Twitter)
- Sound human and authentic, not robotic or overly promotional
- Address the specific pain points and objections mentioned
- Incorporate the business's unique differentiator naturally
- Use the testimonial if relevant to the post type
- Match the specified tone throughout
- Include the business name naturally in the content

Write only the post content, no additional commentary.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert social media content creator specializing in home care marketing. You write authentic, engaging posts that connect with families and build trust in home care services.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedPost = data.choices[0].message.content;

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
