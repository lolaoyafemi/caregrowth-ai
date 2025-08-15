

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

// Database prompt generation function - now uses prompts_modified table
export const generateContentFromDatabasePrompts = async (
  supabase: any,
  params: ContentGenerationParams
): Promise<GeneratedContent | null> => {
  const { userId, postType, tone, platform, audience, businessContext, openAIApiKey } = params;

  console.log('🎯 Fetching prompts from prompts_modified for category:', postType);

  // Get prompt templates from prompts_modified table based on category (content type)
  const { data: prompts, error: promptError } = await supabase
    .from('prompts_modified')
    .select('*')
    .eq('category', postType);

  console.log('✅ Fetched prompts:', prompts?.length || 0, 'prompts found for category:', postType);

  if (promptError) {
    console.error('❌ Prompt fetch error:', promptError);
    return null;
  }

  if (!prompts || prompts.length === 0) {
    console.log('📝 No prompts found for category:', postType);
    return null;
  }

  // Randomly select one prompt from the available prompts for this category
  const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  
  console.log('🎲 Selected random prompt:', selectedPrompt.name, 'from', prompts.length, 'available prompts');

  // Use the prompt field directly (prompts_modified has a single prompt field)
  const promptTemplate = selectedPrompt.prompt || '';
  
  if (!promptTemplate) {
    console.log('❌ No content found in prompt field');
    return null;
  }

  console.log('📄 Using prompts_modified template, length:', promptTemplate.length);

  // Personalize the content with business context using AI
  const personalizedContent = await personalizeWithAI({
    promptContent: promptTemplate,
    businessContext,
    audience,
    tone,
    platform,
    openAIApiKey
  });

  if (personalizedContent) {
    console.log('✅ Successfully personalized content from prompts_modified table');
    return {
      ...personalizedContent,
      source: 'prompts_modified',
      template_id: selectedPrompt.id
    };
  }

  console.log('❌ Failed to personalize content');
  return null;
};

export const personalizeWithAI = async (params: {
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

The template might be a complete post or just a section. Personalize it and then structure your response as a complete social media post with these sections as a single paragraph:

Return your response in this format format:
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
        model: 'gpt-4.1-2025-04-14',
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
        max_completion_tokens: 1000
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

// Optimized model selection for faster responses
const selectOptimalModel = (postType: string, audience: string): string => {
  // Use the mini model for faster generation unless it's a complex reasoning task
  const complexReasoningTypes = ['results-offers', 'trust-authority'];
  const complexAudiences = ['business owners', 'professionals', 'executives'];
  
  const isComplexTask = complexReasoningTypes.includes(postType) || 
                       complexAudiences.some(audienceType => 
                         audience.toLowerCase().includes(audienceType.toLowerCase())
                       );
  
  // Use mini model for speed unless complex reasoning is needed
  return isComplexTask ? 'gpt-4.1-2025-04-14' : 'gpt-4.1-mini-2025-04-14';
};

export const generateContentWithAI = async (params: ContentGenerationParams, supabase: any): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  const selectedModel = selectOptimalModel(postType, audience);
  console.log(`Generating AI content with ${selectedModel} (selected based on complexity)`);
  
  // First try to generate from database prompts
  const databaseContent = await generateContentFromDatabasePrompts(supabase, params);
  if (databaseContent) {
    console.log('Successfully generated content from database prompts');
    return databaseContent;
  }
  
  console.log('Falling back to hardcoded AI generation');
  
  const toneMap = {
    "professional": "Clear, polished, confident, respectful, yet personable",
    "conversational": "Warm, friendly, approachable, informal, like talking to a friend",
    "enthusiastic": "Positive, energetic, uplifting, passionate, inspiring",
    "authoritative": "Strong, confident, assured, expert, trustworthy",
    "humorous": "Light, witty, playful, entertaining, relatable"
  };

  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";

  // Add randomization and variety to ensure unique content
  const currentTime = new Date().toISOString();
  const randomSeed = Math.random().toString(36).substring(7);
  
  // Creative opening variations to avoid repetitive content
  const openingVariations = [
    "Start with an unexpected observation",
    "Open with a relatable moment",
    "Begin with a surprising truth",
    "Start with a gentle insight",
    "Open with a meaningful reflection",
    "Begin with a thought-provoking question",
    "Start with a specific scenario",
    "Open with an empowering statement"
  ];
  
  const selectedOpening = openingVariations[Math.floor(Math.random() * openingVariations.length)];

  // Parse business context to extract key information
  const businessInfo = parseBusinessContext(businessContext);

  // COMMENTED OUT - Original hardcoded prompts for future reference
  /*
  const contentPrompts = {
    "trust-authority": {
      systemPrompt: `You are an expert social media strategist with deep understanding of psychology, business positioning, and audience engagement. When using advanced reasoning models, think through: 1) The emotional state of the target audience, 2) The trust-building elements that matter most to them, 3) How to position expertise without appearing boastful, 4) The subtle psychological triggers that build credibility. Create authentic, strategically crafted content that builds trust through genuine expertise demonstration.`,
      userPrompt: `...trust authority prompt content...`
    },
    "heartfelt-relatable": {
      systemPrompt: `You are an expert social media strategist specializing in emotional intelligence and human connection...`,
      userPrompt: `...heartfelt relatable prompt content...`
    },
    "educational-helpful": {
      systemPrompt: `You are an expert social media strategist and educational content specialist...`,
      userPrompt: `...educational helpful prompt content...`
    },
    "results-offers": {
      systemPrompt: `You are an expert social media strategist with deep expertise in conversion psychology...`,
      userPrompt: `...results offers prompt content...`
    }
  };
  const selectedPrompt = contentPrompts[postType] || contentPrompts["educational-helpful"];
  */

  // Fallback to AI generation if database prompts are not available
  
  const fallbackPrompt = `You are a social media content creator. Create a ${postType} post for ${businessInfo.business_name} on ${platform}.
   
Business Context: ${businessContext}
Target Audience: ${audience}
Tone: ${tone}

Generate original content that is engaging and appropriate for ${platform}. 

Return your response in this format format:
HOOK: [compelling opening - 1-2 sentences]
BODY: [valuable main content - 3-5 sentences]
CTA: [clear call-to-action - 1-2 sentences]`;

  const selectedPrompt = {
    systemPrompt: 'You are an expert social media content creator.',
    userPrompt: fallbackPrompt
  };
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
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
        temperature: 0.9,
        max_completion_tokens: 500,
        top_p: 0.95,
        presence_penalty: 0.3,
        frequency_penalty: 0.4
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
        source: 'enhanced_prompt_ai'
      };
    }
    
    // If parsing fails, throw error to force retry instead of using fallback
    throw new Error('Failed to parse generated content properly');
  } catch (error) {
    console.error('Error generating content:', error);
    throw error; // Let the calling function handle the error instead of using hardcoded fallback
  }
};

// Helper function to parse business context into structured data
const parseBusinessContext = (businessContext: string) => {
  const info = {
    business_name: 'our business',
    core_service: 'our services', 
    location: 'your area',
    ideal_client: 'families needing care',
    pain_points: 'common challenges',
    objections: 'common concerns',
    differentiator: 'professional care',
    big_promise: 'exceptional care'
  };

  // Extract information from business context if available
  const lines = businessContext.split('\n');
  lines.forEach(line => {
    if (line.includes('Business Name:')) {
      info.business_name = line.split('Business Name:')[1]?.trim() || info.business_name;
    }
    if (line.includes('Services:')) {
      info.core_service = line.split('Services:')[1]?.trim() || info.core_service;
    }
    if (line.includes('Location:')) {
      info.location = line.split('Location:')[1]?.trim() || info.location;
    }
    if (line.includes('Target Client:')) {
      info.ideal_client = line.split('Target Client:')[1]?.trim() || info.ideal_client;
    }
    if (line.includes('Client Pain Points:')) {
      info.pain_points = line.split('Client Pain Points:')[1]?.trim() || info.pain_points;
    }
    if (line.includes('Objections:')) {
      info.objections = line.split('Objections:')[1]?.trim() || info.objections;
    }
    if (line.includes('Differentiator:')) {
      info.differentiator = line.split('Differentiator:')[1]?.trim() || info.differentiator;
    }
    if (line.includes('Big Promise:')) {
      info.big_promise = line.split('Big Promise:')[1]?.trim() || info.big_promise;
    }
  });

  return info;
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
  
  // Join all lines with spaces to create single paragraph flow
  hook = hookLines.join(' ').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  body = bodyLines.join(' ').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  cta = ctaLines.join(' ').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  return { hook, body, cta };
};

