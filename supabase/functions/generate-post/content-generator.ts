
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

export interface ContentGenerationParams {
  userId: string;
  postType: string;
  tone: string;
  platform: string;
  audience: string;
  businessContext: string;
  openAIApiKey: string;
}

export interface GeneratedContent {
  hook: string;
  body: string;
  cta: string;
  source: string;
  template_id?: string;
}

export const generateContentFromPrompts = async (
  supabase: any,
  params: ContentGenerationParams
): Promise<GeneratedContent | null> => {
  const { userId, postType, tone, platform, audience, businessContext, openAIApiKey } = params;

  // Get prompt templates for the specified content category and platform
  const { data: prompts, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('category', postType)
    .in('platform', [platform, 'all']);

  console.log('Fetched prompts:', prompts);

  if (promptError) {
    console.error('Prompt fetch error:', promptError);
    return null;
  }

  if (!prompts || prompts.length === 0) {
    return null;
  }

  // Separate prompts by platform preference
  const platformSpecificPrompts = prompts.filter(p => p.platform === platform);
  const generalPrompts = prompts.filter(p => p.platform === 'all');

  const toneMap = {
    "professional": "Clear, polished, confident, respectful",
    "conversational": "Warm, friendly, approachable, informal",
    "enthusiastic": "Positive, energetic, uplifting",
    "authoritative": "Strong, confident, assured, expert",
    "humorous": "Light, witty, playful"
  };
  
  // Choose from platform-specific first, then general
  const availablePrompts = platformSpecificPrompts.length > 0 ? platformSpecificPrompts : generalPrompts;
  
  if (availablePrompts.length === 0) {
    return null;
  }

  // Lookup tone description
  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";

  // Randomly select one row from available prompts
  const selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
  
  console.log('Selected prompt row:', selectedPrompt);

  // For prompts that are actually prompt templates (like the one causing issues), 
  // we need to generate content differently
  if (selectedPrompt.hook && selectedPrompt.hook.includes('You are a compassionate')) {
    // This is a meta-prompt, not actual content - generate new content
    const generationPrompt = `You are a compassionate social media content creator for a home care business called Dam Dam. Create engaging social media content for families caring for ${audience}.

Business Context: ${businessContext}

Create a ${postType} post with a ${tone} tone for ${platform}.

The post should:
- Be authentic and relatable for families caring for ${audience}
- Show understanding of their daily challenges
- Offer hope and support without being salesy
- Be written in a ${tone} tone

Please provide your response in this exact format:
HOOK: [2-3 engaging sentences that grab attention]
BODY: [4-6 paragraphs of valuable content]
CTA: [2-3 sentences with a gentle call to action]`;

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
              content: `You are a professional social media content creator specializing in home care services. Create compassionate, engaging content that resonates with families.`
            },
            {
              role: 'user',
              content: generationPrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedContent = data.choices[0].message.content;
        
        console.log('AI Generated content:', generatedContent);
        
        const parsed = parseGeneratedContent(generatedContent);
        
        if (parsed.hook || parsed.body || parsed.cta) {
          return {
            ...parsed,
            source: 'ai_generated',
            template_id: selectedPrompt?.id
          };
        }
      }
    } catch (error) {
      console.error('Error generating content with AI:', error);
    }
  }

  // For regular prompts with actual content, use them directly
  return {
    hook: selectedPrompt.hook || '',
    body: selectedPrompt.body || '',
    cta: selectedPrompt.cta || '',
    source: 'database_original',
    template_id: selectedPrompt?.id
  };
};

export const generateContentWithAI = async (params: ContentGenerationParams): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  console.log('Generating new content with OpenAI for:', { postType, audience, tone, platform });
  
  const generationPrompt = `Create engaging social media content for a home care business serving families with ${audience}.

Business Context: ${businessContext}

Content Requirements:
- Type: ${postType}
- Tone: ${tone}
- Platform: ${platform}
- Audience: Families caring for ${audience}

Create a complete social media post that:
1. Opens with an engaging hook that resonates with the target audience
2. Provides valuable, helpful content in the body
3. Ends with a gentle, non-pushy call to action

Format your response exactly as:
HOOK: [your hook content]
BODY: [your body content]
CTA: [your call to action]`;

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
            content: `You are a professional social media content creator specializing in home care services. Create compassionate, engaging content that resonates with families caring for their loved ones.`
          },
          {
            role: 'user',
            content: generationPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
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

    const parsed = parseGeneratedContent(generatedContent);
    
    // Fallback parsing if format not followed
    if (!parsed.hook && !parsed.body && !parsed.cta) {
      const contentLines = generatedContent.split('\n').filter(line => line.trim());
      if (contentLines.length >= 3) {
        return {
          hook: contentLines[0] || 'Caring for your loved ones is a journey.',
          body: contentLines.slice(1, -1).join('\n') || 'We understand the challenges families face and are here to provide compassionate, professional care.',
          cta: contentLines[contentLines.length - 1] || 'Contact us today to learn how we can support your family.',
          source: 'ai_generated'
        };
      }
    }
    
    return {
      ...parsed,
      source: 'ai_generated'
    };
  } catch (error) {
    console.error('Error generating content:', error);
    // Ultimate fallback
    return {
      hook: 'Caring for your loved ones is a journey.',
      body: 'We understand the challenges families face when caring for their loved ones. Our team provides compassionate, professional care tailored to your specific needs.',
      cta: 'Contact us today to learn how we can support your family.',
      source: 'ai_generated'
    };
  }
};

export const parseGeneratedContent = (content: string): { hook: string; body: string; cta: string } => {
  let hook = '', body = '', cta = '';
  
  // Parse the content and remove formatting labels
  const lines = content.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.toLowerCase().startsWith('hook:')) {
      currentSection = 'hook';
      hook = trimmedLine.replace(/^hook:\s*/i, '').trim();
    } else if (trimmedLine.toLowerCase().startsWith('body:')) {
      currentSection = 'body';
      body = trimmedLine.replace(/^body:\s*/i, '').trim();
    } else if (trimmedLine.toLowerCase().startsWith('cta:')) {
      currentSection = 'cta';
      cta = trimmedLine.replace(/^cta:\s*/i, '').trim();
    } else if (trimmedLine && currentSection) {
      // Continue adding to current section
      if (currentSection === 'hook') {
        hook += (hook ? ' ' : '') + trimmedLine;
      } else if (currentSection === 'body') {
        body += (body ? '\n' : '') + trimmedLine;
      } else if (currentSection === 'cta') {
        cta += (cta ? ' ' : '') + trimmedLine;
      }
    }
  }
  
  return { hook, body, cta };
};
