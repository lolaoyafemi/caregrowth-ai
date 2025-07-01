
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

// COMMENTED OUT - Database prompt generation
/*
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
  console.log('First prompt structure:', prompts?.[0] ? Object.keys(prompts[0]) : 'No prompts');

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
  console.log('Selected prompt keys:', Object.keys(selectedPrompt));

  // Get the prompt content - try different possible field names
  let promptContent = '';
  if (selectedPrompt.prompt) {
    promptContent = selectedPrompt.prompt;
    console.log('Using prompt field:', promptContent.substring(0, 100));
  } else if (selectedPrompt.hook) {
    promptContent = selectedPrompt.hook;
    console.log('Using hook field (fallback):', promptContent.substring(0, 100));
  } else if (selectedPrompt.body) {
    promptContent = selectedPrompt.body;
    console.log('Using body field (fallback):', promptContent.substring(0, 100));
  } else {
    console.log('No prompt content found in any field');
    console.log('Available fields:', Object.keys(selectedPrompt));
    return null;
  }

  // Skip if prompt is completely empty
  if (!promptContent || !promptContent.trim()) {
    console.log('Prompt content is empty after all attempts, skipping');
    return null;
  }

  console.log('Final prompt content length:', promptContent.length);

  // Personalize the content with business context using AI
  const personalizedContent = await personalizeWithAI({
    promptContent,
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
  promptContent: string;
  businessContext: string;
  audience: string;
  tone: string;
  platform: string;
  openAIApiKey: string;
}): Promise<{ hook: string; body: string; cta: string } | null> => {
  const { promptContent, businessContext, audience, tone, platform, openAIApiKey } = params;

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
${promptContent}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Instructions:
✅ Use the template content as your foundation - don't completely rewrite it
✅ Replace generic placeholders with specific business information from the context
✅ Maintain the original style and intent of the template
✅ Make it feel authentic to this specific business
✅ Use the ${tone} tone throughout
✅ Keep it appropriate for ${platform}
✅ Make it speak directly to ${audience}
✅ Incorporate business name, location, services, and unique value propositions naturally

The template might be a complete post or just a section. Personalize it and then structure your response as a complete social media post with these sections:

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
            content: 'You are a social media content personalization expert. You take templates and personalize them with business-specific information while structuring them into complete social media posts.'
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
*/

export const generateContentWithAI = async (params: ContentGenerationParams): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  console.log('Generating AI content with coded prompts');
  
  const toneMap = {
    "professional": "Clear, polished, confident, respectful",
    "conversational": "Warm, friendly, approachable, informal",
    "enthusiastic": "Positive, energetic, uplifting",
    "authoritative": "Strong, confident, assured, expert",
    "humorous": "Light, witty, playful"
  };

  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";

  // Content category specific prompts written in code
  const contentPrompts = {
    "trust-authority": {
      systemPrompt: "You are a social media expert specializing in trust-building and authority content. Create posts that establish credibility, showcase expertise, and build confidence in the business.",
      userPrompt: `Create a ${postType} social media post that builds trust and demonstrates authority.

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Focus on:
✅ Establishing credibility and expertise
✅ Sharing industry insights or behind-the-scenes content
✅ Highlighting credentials, experience, or success stories
✅ Building confidence in your services
✅ Using social proof or testimonials if relevant
✅ Speaking directly to ${audience} with ${tone} tone

Return your response in this exact format:
HOOK: [compelling opening that builds trust - 1-2 sentences]
BODY: [content that demonstrates authority and expertise - 3-5 sentences]
CTA: [confidence-building call-to-action - 1-2 sentences]`
    },
    "heartfelt-relatable": {
      systemPrompt: "You are a social media expert specializing in heartfelt, relatable content. Create posts that connect emotionally with audiences and feel authentic and personal.",
      userPrompt: `Create a ${postType} social media post that is heartfelt and relatable.

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Focus on:
✅ Creating emotional connection with the audience
✅ Sharing personal stories or experiences
✅ Being vulnerable and authentic
✅ Addressing common challenges or pain points
✅ Making the audience feel understood and seen
✅ Using ${tone} tone that resonates with ${audience}

Return your response in this exact format:
HOOK: [emotionally engaging opening - 1-2 sentences]
BODY: [heartfelt, relatable content - 3-5 sentences]
CTA: [warm, inviting call-to-action - 1-2 sentences]`
    },
    "educational-helpful": {
      systemPrompt: "You are a social media expert specializing in educational and helpful content. Create posts that provide genuine value, tips, and insights to help your audience succeed.",
      userPrompt: `Create a ${postType} social media post that educates and helps the audience.

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Focus on:
✅ Providing actionable tips or insights
✅ Sharing valuable knowledge or best practices
✅ Solving common problems or challenges
✅ Teaching something new and useful
✅ Making complex topics easy to understand
✅ Speaking to ${audience} with ${tone} tone

Return your response in this exact format:
HOOK: [attention-grabbing educational hook - 1-2 sentences]
BODY: [helpful, informative content with actionable advice - 3-5 sentences]
CTA: [encouraging call-to-action that invites engagement - 1-2 sentences]`
    },
    "results-offers": {
      systemPrompt: "You are a social media expert specializing in results-driven and promotional content. Create posts that highlight outcomes, showcase offers, and drive conversions.",
      userPrompt: `Create a ${postType} social media post that showcases results and presents offers.

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}

Focus on:
✅ Highlighting specific results or outcomes
✅ Showcasing transformations or success stories
✅ Presenting compelling offers or promotions
✅ Creating urgency or scarcity when appropriate
✅ Demonstrating clear value proposition
✅ Speaking to ${audience} with ${tone} tone

Return your response in this exact format:
HOOK: [results-focused hook that grabs attention - 1-2 sentences]
BODY: [content highlighting outcomes and presenting offer - 3-5 sentences]
CTA: [strong, action-oriented call-to-action - 1-2 sentences]`
    }
  };

  const selectedPrompt = contentPrompts[postType] || contentPrompts["educational-helpful"];
  
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
            content: selectedPrompt.systemPrompt
          },
          {
            role: 'user',
            content: selectedPrompt.userPrompt
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
    console.log('Generated content with coded prompts:', generatedContent);

    const parsed = parseGeneratedContent(generatedContent);
    
    // Ensure we have proper content
    if (parsed.hook && parsed.body && parsed.cta) {
      return {
        ...parsed,
        source: 'coded_prompt_ai'
      };
    }
    
    // Fallback with simple content
    return {
      hook: `Looking for quality ${postType.replace('-', ' ')} solutions?`,
      body: `Our team specializes in helping ${audience} achieve their goals with professional, reliable service. We understand the unique challenges you face and have the expertise to provide effective solutions.`,
      cta: 'Contact us today to learn how we can help!',
      source: 'coded_prompt_ai'
    };
  } catch (error) {
    console.error('Error generating content:', error);
    // Ultimate fallback
    return {
      hook: `Professional ${postType.replace('-', ' ')} services for ${audience}`,
      body: 'Our experienced team provides high-quality solutions tailored to your specific needs. We combine expertise with personalized service to deliver results that matter.',
      cta: 'Get in touch to discover how we can support your success!',
      source: 'coded_prompt_ai'
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
