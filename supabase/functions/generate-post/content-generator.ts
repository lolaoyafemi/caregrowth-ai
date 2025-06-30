
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

  // Get the template content - it's stored in the hook field
  const templateContent = selectedPrompt.hook || selectedPrompt.body || selectedPrompt.cta || '';

  // Build dynamic prompt for generating actual content from the template
  const generationPrompt = `You are a creative social media content writer. Your task is to create an engaging ${postType} post for ${platform}.

Business Context:
${businessContext}

Template to use as inspiration:
${templateContent}

Requirements:
- Content Category: ${postType}
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Instructions:
✅ Create original, engaging content inspired by the template
✅ Write naturally in the specified ${tone} tone
✅ Make it specific to the target audience: ${audience}
✅ Include relevant business context naturally
✅ Create a complete post with hook, body, and call-to-action
✅ Make it feel authentic and human, not templated

DO NOT return the template itself. Generate NEW content inspired by it.

Return your response in this exact format:
HOOK: [engaging opening that captures attention - 1-2 sentences]
BODY: [main content with value and personality - 3-5 sentences]
CTA: [compelling call-to-action - 1-2 sentences]`;

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
            content: `You are an expert social media content creator specializing in ${postType} content for ${audience}. You create original, engaging posts that build authentic connections and drive engagement.`
          },
          {
            role: 'user',
            content: generationPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      })
    });

    if (response.ok) {
      const data = await response.json();
      const generatedContent = data.choices[0].message.content;
      
      console.log('Generated content from template:', generatedContent);
      
      const parsed = parseGeneratedContent(generatedContent);
      
      // Ensure we have actual content, not template instructions
      if (parsed.hook && parsed.body && parsed.cta) {
        // Check if the content looks like instructions or templates
        const combinedContent = `${parsed.hook} ${parsed.body} ${parsed.cta}`.toLowerCase();
        const templateIndicators = ['[', ']', '{', '}', 'template', 'instruction', 'format', 'example'];
        
        const hasTemplateIndicators = templateIndicators.some(indicator => 
          combinedContent.includes(indicator)
        );
        
        if (!hasTemplateIndicators) {
          return {
            ...parsed,
            source: 'database_generated',
            template_id: selectedPrompt?.id
          };
        }
      }
    }

    console.log('Template generation failed, falling back to AI generation');
    return null;
  } catch (error) {
    console.error('Error generating content from template:', error);
    return null;
  }
};

export const generateContentWithAI = async (params: ContentGenerationParams): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  console.log('Generating fresh content with OpenAI');
  
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
