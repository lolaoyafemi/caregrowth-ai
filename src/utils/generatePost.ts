import { supabase } from '@/integrations/supabase/client'

export const generatePost = async (
  userId: string,
  category: string,
  tone: string,
  platform: string,
  audience: string
) => {
  try {
    const { data: promptData, error: promptError } = await supabase
      .from('prompts')
      .select('hook, body, cta')
      .eq('category', category)
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (promptError || !promptData) {
      throw new Error('No matching prompt found for selected inputs.');
    }

    const { hook, body, cta } = promptData;

    const filledPrompt = `
HOOK: ${hook.replace(/{audience}/g, audience)}
BODY: ${body.replace(/{audience}/g, audience)}
CTA: ${cta.replace(/{audience}/g, audience)}

TONE: ${tone}
PLATFORM: ${platform}
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media copywriter for healthcare and service-based businesses.',
          },
          {
            role: 'user',
            content: filledPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const aiData = await openaiResponse.json();

    if (!aiData.choices || !aiData.choices[0]) {
      throw new Error('OpenAI returned no result.');
    }

    return {
      post: aiData.choices[0].message.content,
    };
  } catch (error: any) {
    console.error('Error generating post:', error);
    return { error: error.message };
  }
};
