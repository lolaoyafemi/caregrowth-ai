
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

  console.log('Fetching prompts for:', { postType, platform });

  // Get prompt templates for the specified content category and platform
  const { data: prompts, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('category', postType)
    .in('platform', [platform, 'all']);

  console.log('Fetched prompts:', prompts?.length || 0, 'prompts found');

  if (promptError) {
    console.error('Prompt fetch error:', promptError);
    return null;
  }

  if (!prompts || prompts.length === 0) {
    console.log('No prompts found for category:', postType, 'platform:', platform);
    return null;
  }

  // Separate prompts by platform preference
  const platformSpecificPrompts = prompts.filter(p => p.platform === platform);
  const generalPrompts = prompts.filter(p => p.platform === 'all');

  // Choose from platform-specific first, then general
  const availablePrompts = platformSpecificPrompts.length > 0 ? platformSpecificPrompts : generalPrompts;
  
  if (availablePrompts.length === 0) {
    console.log('No available prompts after filtering');
    return null;
  }

  // Randomly select one prompt from available prompts
  const selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
  
  console.log('Selected prompt:', selectedPrompt.id, selectedPrompt.name);

  // Use the actual prompt content directly
  let hook = selectedPrompt.hook || '';
  let body = selectedPrompt.body || '';
  let cta = selectedPrompt.cta || '';

  console.log('Original prompt content:', { hook: hook.substring(0, 50), body: body.substring(0, 50), cta: cta.substring(0, 50) });

  // If ALL sections are empty, skip this prompt - but allow some sections to be empty
  if (!hook.trim() && !body.trim() && !cta.trim()) {
    console.log('All prompt sections are empty, skipping');
    return null;
  }

  // Personalize the content with business context using AI
  const personalizedContent = await personalizeWithAI({
    hook,
    body,
    cta,
    businessContext,
    audience,
    tone,
    platform,
    openAIApiKey
  });

  if (personalizedContent) {
    console.log('Successfully personalized content from database prompt');
    return {
      ...personalizedContent,
      source: 'database_prompt',
      template_id: selectedPrompt.id
    };
  }

  console.log('Failed to personalize content, will try next approach');
  return null;
};

const personalizeWithAI = async (params: {
  hook: string;
  body: string;
  cta: string;
  businessContext: string;
  audience: string;
  tone: string;
  platform: string;
  openAIApiKey: string;
}): Promise<{ hook: string; body: string; cta: string } | null> => {
  const { hook, body, cta, businessContext, audience, tone, platform, openAIApiKey } = params;

  const toneMap = {
    "professional": "Clear, polished, confident, respectful",
    "conversational": "Warm, friendly, approachable, informal",
    "enthusiastic": "Positive, energetic, uplifting",
    "authoritative": "Strong, confident, assured, expert",
    "humorous": "Light, witty, playful"
  };

  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";

  const personalizationPrompt = `You are a content personalization expert. Your task is to take a social media post template and personalize it using business information.

Business Context:
${businessContext}

Template to personalize:
HOOK: ${hook}
BODY: ${body}
CTA: ${cta}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Instructions:
✅ Use the template content as your foundation - don't completely rewrite it
✅ Replace generic placeholders with specific business information from the context
✅ Maintain the original style and intent of each section
✅ If a section is empty or very short, enhance it with relevant business details
✅ Make it feel authentic to this specific business
✅ Use the ${tone} tone throughout
✅ Keep it appropriate for ${platform}
✅ Make it speak directly to ${audience}
✅ Incorporate business name, location, services, and unique value propositions naturally

Return your response in this exact format:
HOOK: [personalized hook]
BODY: [personalized body]
CTA: [personalized call-to-action]`;

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
            content: 'You are a social media content personalization expert. You take templates and personalize them with business-specific information while maintaining the original structure and intent.'
          },
          {
            role: 'user',
            content: personalizationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return null;
    }

    const data = await response.json();
    const personalizedContent = data.choices[0].message.content;
    
    console.log('Personalized content received:', personalizedContent.substring(0, 200));
    
    return parseGeneratedContent(personalizedContent);
  } catch (error) {
    console.error('Error personalizing content:', error);
    return null;
  }
};

export const generateContentWithAI = async (params: ContentGenerationParams): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  console.log('Generating fresh AI content as fallback');
  
  const toneMap = {
    "professional": "Clear, polished, confident, respectful",
    "conversational": "Warm, friendly, approachable, informal",
    "enthusiastic": "Positive, energetic, uplifting",
    "authoritative": "Strong, confident, assured, expert",
    "humorous": "Light, witty, playful"
  };

  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";
  
  const generationPrompt = `Create engaging ${postType} social media content for ${platform}.

Business Context:
${businessContext}

Requirements:
- Content Category: ${postType}
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Create original, valuable content that:
✅ Speaks directly to ${audience}
✅ Uses ${tone} tone naturally
✅ Provides genuine value or insight
✅ Builds trust and engagement
✅ Includes a clear call-to-action
✅ Feels authentic and human

Return your response in this exact format:
HOOK: [compelling opening - 1-2 sentences]
BODY: [valuable main content - 3-5 sentences]
CTA: [clear call-to-action - 1-2 sentences]`;

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
            content: `You are an expert social media content creator specializing in ${postType} content. You create original, engaging posts that resonate with ${audience} and drive meaningful engagement.`
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
    console.log('Fresh generated content:', generatedContent);

    const parsed = parseGeneratedContent(generatedContent);
    
    // Ensure we have proper content
    if (parsed.hook && parsed.body && parsed.cta) {
      return {
        ...parsed,
        source: 'ai_generated'
      };
    }
    
    // Fallback with simple content
    return {
      hook: `Looking for quality ${postType.replace('-', ' ')} solutions?`,
      body: `Our team specializes in helping ${audience} achieve their goals with professional, reliable service. We understand the unique challenges you face and have the expertise to provide effective solutions.`,
      cta: 'Contact us today to learn how we can help!',
      source: 'ai_generated'
    };
  } catch (error) {
    console.error('Error generating content:', error);
    // Ultimate fallback
    return {
      hook: `Professional ${postType.replace('-', ' ')} services for ${audience}`,
      body: 'Our experienced team provides high-quality solutions tailored to your specific needs. We combine expertise with personalized service to deliver results that matter.',
      cta: 'Get in touch to discover how we can support your success!',
      source: 'ai_generated'
    };
  }
};

export const parseGeneratedContent = (content: string): { hook: string; body: string; cta: string } => {
  let hook = '', body = '', cta = '';
  
  // Split content by lines and clean up
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentSection = '';
  let hookLines = [];
  let bodyLines = [];
  let ctaLines = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.startsWith('hook:')) {
      currentSection = 'hook';
      const hookContent = line.replace(/^hook:\s*/i, '').trim();
      if (hookContent) hookLines.push(hookContent);
    } else if (lowerLine.startsWith('body:')) {
      currentSection = 'body';
      const bodyContent = line.replace(/^body:\s*/i, '').trim();
      if (bodyContent) bodyLines.push(bodyContent);
    } else if (lowerLine.startsWith('cta:')) {
      currentSection = 'cta';
      const ctaContent = line.replace(/^cta:\s*/i, '').trim();
      if (ctaContent) ctaLines.push(ctaContent);
    } else if (line && currentSection) {
      // Add content to current section
      if (currentSection === 'hook') hookLines.push(line);
      else if (currentSection === 'body') bodyLines.push(line);
      else if (currentSection === 'cta') ctaLines.push(line);
    }
  }
  
  hook = hookLines.join(' ').trim();
  body = bodyLines.join(' ').trim();
  cta = ctaLines.join(' ').trim();
  
  return { hook, body, cta };
};
