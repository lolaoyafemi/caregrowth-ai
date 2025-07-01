
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
    "professional": "Clear, polished, confident, respectful, yet personable",
    "conversational": "Warm, friendly, approachable, informal, like talking to a friend",
    "enthusiastic": "Positive, energetic, uplifting, passionate, inspiring",
    "authoritative": "Strong, confident, assured, expert, trustworthy",
    "humorous": "Light, witty, playful, entertaining, relatable"
  };

  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";

  // Add randomization to prompts to ensure variety
  const currentTime = new Date().toISOString();
  const randomSeed = Math.random().toString(36).substring(7);

  // Enhanced content category specific prompts with more engaging, human-like approach
  const contentPrompts = {
    "trust-authority": {
      systemPrompt: "You are a social media expert who creates authentic, engaging content that builds trust and authority. Your posts feel human, personal, and relatable while establishing credibility. Avoid corporate speak and robotic language. Use storytelling, personal anecdotes, and genuine insights. Create unique, varied content each time - never repeat the same stories or examples.",
      userPrompt: `Create a UNIQUE and engaging ${postType} social media post that builds trust and demonstrates authority in a human, relatable way.

IMPORTANT: Generate completely fresh, original content. Do not use any previously generated examples or templates.

Current context: ${currentTime} - Seed: ${randomSeed}

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}
- Make it 150-300 words total
- Use fresh storytelling elements and personal insights
- Include specific, unique details that make it feel authentic
- Avoid generic business language
- Make it feel like a real person is sharing valuable insights
- Create completely original content, not recycled examples

Focus on:
✅ Sharing a NEW personal story or behind-the-scenes moment (not previously used)
✅ Demonstrating expertise through specific, fresh examples or case studies
✅ Using conversational language that builds connection
✅ Including relatable challenges or "aha moments" that haven't been used before
✅ Showing vulnerability or lessons learned in unique ways
✅ Using emojis strategically (but not excessively) if appropriate for the platform
✅ Creating content that people would actually want to read and engage with

Return your response in this exact format:
HOOK: [compelling opening that draws readers in with curiosity or emotion - 1-2 sentences]
BODY: [engaging story or insight that demonstrates authority while being relatable - 4-6 sentences with specific details]
CTA: [natural, non-pushy invitation to connect or engage - 1-2 sentences]`
    },
    "heartfelt-relatable": {
      systemPrompt: "You are a social media expert who creates deeply human, emotionally resonant content. Your posts make people feel seen, understood, and connected. Use personal stories, vulnerable moments, and genuine emotions to create authentic connections. Always generate unique, original content - never repeat stories or examples.",
      userPrompt: `Create a UNIQUE, heartfelt, relatable ${postType} social media post that creates genuine emotional connection.

IMPORTANT: Generate completely fresh, original content. Avoid any previously used stories or examples.

Current context: ${currentTime} - Seed: ${randomSeed}

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}
- Make it 150-300 words total
- Share a NEW personal story or vulnerable moment
- Include specific, unique relatable details
- Show genuine emotion and empathy
- Make it feel like a real conversation

Focus on:
✅ Opening with a fresh, relatable struggle or moment of vulnerability
✅ Sharing specific details that make the story vivid and real (not used before)
✅ Acknowledging common challenges your audience faces in new ways
✅ Using "I" statements and personal experiences that are unique
✅ Including emotional language that resonates
✅ Showing growth, learning, or transformation through original examples
✅ Making the audience feel understood and less alone
✅ Ending with hope, encouragement, or community building

Return your response in this exact format:
HOOK: [emotionally engaging opening that makes people stop scrolling - 1-2 sentences]
BODY: [heartfelt story or insight with specific details and genuine emotion - 4-6 sentences]
CTA: [warm, inclusive invitation that builds community - 1-2 sentences]`
    },
    "educational-helpful": {
      systemPrompt: "You are a social media expert who creates valuable, educational content that genuinely helps people. Your posts teach something useful while being engaging and easy to understand. You break down complex topics into digestible, actionable insights. Generate unique content every time - never repeat tips or examples.",
      userPrompt: `Create a UNIQUE educational, helpful ${postType} social media post that provides genuine value to your audience.

IMPORTANT: Generate completely original content with fresh tips and examples.

Current context: ${currentTime} - Seed: ${randomSeed}

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}
- Make it 150-300 words total
- Provide actionable, specific advice that hasn't been shared before
- Use clear, simple language
- Include NEW examples or step-by-step guidance
- Make complex topics easy to understand

Focus on:
✅ Starting with a fresh problem or question your audience has
✅ Providing specific, actionable steps or solutions (not previously used)
✅ Using numbered lists, bullet points, or clear structure
✅ Including NEW real examples or case studies
✅ Explaining the "why" behind your advice in original ways
✅ Making it immediately useful and implementable
✅ Avoiding jargon and keeping it accessible
✅ Ending with encouragement to take action

Return your response in this exact format:
HOOK: [attention-grabbing statement about a common problem or opportunity - 1-2 sentences]
BODY: [valuable, actionable advice with specific steps or examples - 4-6 sentences]
CTA: [encouraging invitation to implement the advice or ask questions - 1-2 sentences]`
    },
    "results-offers": {
      systemPrompt: "You are a social media expert who creates compelling content that showcases results and presents offers in an authentic, non-salesy way. Your posts highlight real outcomes and genuine value while maintaining trust and credibility. Always generate unique success stories and examples.",
      userPrompt: `Create a UNIQUE results-focused ${postType} social media post that showcases outcomes and presents offers authentically.

IMPORTANT: Generate completely original success stories and examples.

Current context: ${currentTime} - Seed: ${randomSeed}

Business Context:
${businessContext}

Requirements:
- Target Audience: ${audience}
- Tone: ${tone} (${toneDescription})
- Platform: ${platform}
- Make it 150-300 words total
- Highlight specific, measurable results (create new examples)
- Present offers naturally within valuable content
- Avoid pushy sales language
- Build credibility through fresh social proof

Focus on:
✅ Opening with a specific, impressive result or transformation (not used before)
✅ Sharing the story behind the success with unique details
✅ Including concrete numbers, percentages, or specific outcomes
✅ Mentioning client testimonials or case studies naturally (create new ones)
✅ Explaining your process or methodology briefly in original ways
✅ Presenting your offer as a natural solution
✅ Creating urgency through value, not pressure
✅ Building trust through transparency and specificity

Return your response in this exact format:
HOOK: [compelling result or transformation that grabs attention - 1-2 sentences]
BODY: [story of success with specific details and social proof - 4-6 sentences]
CTA: [natural offer presentation with clear value proposition - 1-2 sentences]`
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
        temperature: 1.0, // Maximum creativity for unique content
        max_tokens: 2000,
        presence_penalty: 0.6, // Strong penalty to avoid repetition
        frequency_penalty: 0.8, // Strong penalty for more diverse language
        top_p: 0.9 // Add randomness to selection
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    console.log('Generated fresh content:', generatedContent);

    const parsed = parseGeneratedContent(generatedContent);
    
    // Ensure we have proper content
    if (parsed.hook && parsed.body && parsed.cta) {
      return {
        ...parsed,
        source: 'coded_prompt_ai'
      };
    }
    
    // If parsing fails, throw error to force retry instead of using fallback
    throw new Error('Failed to parse generated content properly');
  } catch (error) {
    console.error('Error generating content:', error);
    throw error; // Let the calling function handle the error instead of using hardcoded fallback
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
    
    // Handle both formats: "HOOK:" and "**HOOK:**"
    if (lowerLine.startsWith('hook:') || lowerLine.startsWith('**hook:**')) {
      currentSection = 'hook';
      // Remove both "HOOK:" and "**HOOK:**" prefixes
      const hookContent = line.replace(/^\*{0,2}hook:\*{0,2}\s*/i, '').trim();
      if (hookContent) hookLines.push(hookContent);
    } else if (lowerLine.startsWith('body:') || lowerLine.startsWith('**body:**')) {
      currentSection = 'body';
      // Remove both "BODY:" and "**BODY:**" prefixes
      const bodyContent = line.replace(/^\*{0,2}body:\*{0,2}\s*/i, '').trim();
      if (bodyContent) bodyLines.push(bodyContent);
    } else if (lowerLine.startsWith('cta:') || lowerLine.startsWith('**cta:**')) {
      currentSection = 'cta';
      // Remove both "CTA:" and "**CTA:**" prefixes
      const ctaContent = line.replace(/^\*{0,2}cta:\*{0,2}\s*/i, '').trim();
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
