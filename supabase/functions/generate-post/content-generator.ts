

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

// Enhanced model selection based on content complexity
const selectOptimalModel = (postType: string, audience: string): string => {
  // Use o3-2025-04-16 for complex reasoning tasks that require:
  // - Multi-step thinking about audience psychology
  // - Strategic content planning
  // - Complex business positioning
  const complexReasoningTypes = ['results-offers', 'trust-authority'];
  const complexAudiences = ['business owners', 'professionals', 'executives'];
  
  const isComplexTask = complexReasoningTypes.includes(postType) || 
                       complexAudiences.some(audienceType => 
                         audience.toLowerCase().includes(audienceType.toLowerCase())
                       );
  
  return isComplexTask ? 'o3-2025-04-16' : 'gpt-4.1-2025-04-14';
};

export const generateContentWithAI = async (params: ContentGenerationParams): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  const selectedModel = selectOptimalModel(postType, audience);
  console.log(`Generating AI content with ${selectedModel} (selected based on complexity)`);
  
  const toneMap = {
    "professional": "Clear, polished, confident, respectful, yet personable",
    "conversational": "Warm, friendly, approachable, informal, like talking to a friend",
    "enthusiastic": "Positive, energetic, uplifting, passionate, inspiring",
    "authoritative": "Strong, confident, assured, expert, trustworthy",
    "humorous": "Light, witty, playful, entertaining, relatable"
  };

  const toneDescription = toneMap[tone.toLowerCase()] || "Clear and natural tone";

  // Add randomization to ensure variety
  const currentTime = new Date().toISOString();
  const randomSeed = Math.random().toString(36).substring(7);

  // Parse business context to extract key information
  const businessInfo = parseBusinessContext(businessContext);

  // Enhanced content category specific prompts optimized for advanced AI reasoning
  const contentPrompts = {
    "trust-authority": {
      systemPrompt: `You are an expert social media strategist with deep understanding of psychology, business positioning, and audience engagement. When using advanced reasoning models, think through: 1) The emotional state of the target audience, 2) The trust-building elements that matter most to them, 3) How to position expertise without appearing boastful, 4) The subtle psychological triggers that build credibility. Create authentic, strategically crafted content that builds trust through genuine expertise demonstration.`,
      userPrompt: `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create a Trust & Authority post that demonstrates expertise while building genuine connection with ${businessInfo.ideal_client}.

IMPORTANT: Generate completely fresh, original content. Avoid starting with "Have you ever" or other overused openings.

Current context: ${currentTime} - Seed: ${randomSeed}

The tone for this post is: ${tone}.
Examples of this tone: ${toneDescription}.
Let this tone shape the style, word choice, and flow naturally.

Use these points as invisible guidance — do not copy them into the post directly:
- The daily pressures their audience faces: ${businessInfo.pain_points}
- The hidden doubts or hesitations they have before seeking help: ${businessInfo.objections}
- What makes ${businessInfo.business_name} different: ${businessInfo.differentiator}
- The promise they stand by: ${businessInfo.big_promise}

✅ Write a post that feels confident, genuine, and human — aim for about 200-250 words to provide depth and authority.
✅ Make the post sound natural and sincere, as if ${businessInfo.business_name} is speaking directly to the reader in their chosen tone.
✅ Focus on sharing expertise and building trust — no generic filler or robotic language.
✅ Use varied, creative openings that avoid overused phrases like "Have you ever" or "Raise your hand if"
✅ End with a soft, tone-appropriate invitation that encourages engagement.

Main goal of this post: Build trust and establish authority while connecting authentically with families.

Return your response in this exact format:
HOOK: [compelling opening that draws readers in - 1-2 sentences]
BODY: [authoritative content that demonstrates expertise - 4-6 sentences with specific details]
CTA: [natural invitation to connect or engage - 1-2 sentences]`
    },
    "heartfelt-relatable": {
      systemPrompt: `You are an expert social media strategist specializing in emotional intelligence and human connection. When using advanced reasoning models, analyze: 1) The deep emotional needs of the audience, 2) The shared experiences that create bonds, 3) The vulnerability level that builds connection without oversharing, 4) The language patterns that evoke empathy. Create deeply resonant content that makes people feel genuinely understood.`,
      userPrompt: `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create a Heartfelt & Relatable post that creates genuine emotional connection with ${businessInfo.ideal_client}.

IMPORTANT: Generate completely fresh, original content. Avoid starting with "Have you ever" or other overused openings.

Current context: ${currentTime} - Seed: ${randomSeed}

The tone for this post is: ${tone}.
Examples of this tone: ${toneDescription}.
Let this tone shape the style, word choice, and flow naturally.

Use these points as invisible guidance — do not copy them into the post directly:
- The daily pressures their audience faces: ${businessInfo.pain_points}
- The hidden doubts or hesitations they have before seeking help: ${businessInfo.objections}
- What makes ${businessInfo.business_name} different: ${businessInfo.differentiator}
- The promise they stand by: ${businessInfo.big_promise}

✅ Write a post that feels warm, genuine, and human — aim for about 200-250 words to create meaningful connection.
✅ Make the post sound natural and sincere, as if ${businessInfo.business_name} is speaking directly to the reader in their chosen tone.
✅ Focus on shared experiences and emotional connection — no generic filler or robotic language.
✅ Use varied, creative openings that feel fresh and authentic
✅ End with a soft, tone-appropriate invitation that builds community.

Main goal of this post: Create genuine emotional connection and make families feel understood and less alone.

Return your response in this exact format:
HOOK: [emotionally engaging opening that makes people stop scrolling - 1-2 sentences]
BODY: [heartfelt content with specific details and genuine emotion - 4-6 sentences]
CTA: [warm, inclusive invitation that builds community - 1-2 sentences]`
    },
    "educational-helpful": {
      systemPrompt: `You are an expert social media strategist and educational content specialist. When using advanced reasoning models, consider: 1) The cognitive load of your audience and optimal information delivery, 2) The learning preferences of busy families, 3) How to make complex information immediately actionable, 4) The balance between depth and accessibility. Create valuable content that genuinely educates while respecting the audience's time and mental bandwidth.`,
      userPrompt: `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create an Educational & Helpful post that provides genuine value to ${businessInfo.ideal_client}.

IMPORTANT: Generate completely fresh, original content. Avoid starting with "Have you ever" or other overused openings.

Current context: ${currentTime} - Seed: ${randomSeed}

The tone for this post is: ${tone}.
Examples of this tone: ${toneDescription}.
Let this tone shape the style, word choice, and flow naturally.

Use these points as invisible guidance — do not copy them into the post directly:
- The daily pressures their audience faces: ${businessInfo.pain_points}
- The hidden doubts or hesitations they have before seeking help: ${businessInfo.objections}
- What makes ${businessInfo.business_name} different: ${businessInfo.differentiator}
- The promise they stand by: ${businessInfo.big_promise}

✅ Write a post that feels helpful, genuine, and human — aim for about 200-250 words to provide valuable insights.
✅ Make the post sound natural and sincere, as if ${businessInfo.business_name} is speaking directly to the reader in their chosen tone.
✅ Focus on providing actionable advice and useful information — no generic filler or robotic language.
✅ Use varied, creative openings that immediately signal value
✅ End with a soft, tone-appropriate invitation to implement the advice or ask questions.

Main goal of this post: Provide genuine value and establish ${businessInfo.business_name} as a helpful resource for families.

Return your response in this exact format:
HOOK: [attention-grabbing statement about valuable information - 1-2 sentences]
BODY: [valuable, actionable advice with specific examples - 4-6 sentences]
CTA: [encouraging invitation to implement or ask questions - 1-2 sentences]`
    },
    "results-offers": {
      systemPrompt: `You are an expert social media strategist with deep expertise in conversion psychology and authentic sales communication. When using advanced reasoning models, analyze: 1) The decision-making psychology of your audience, 2) The objections and hesitations they harbor, 3) The social proof elements that build confidence, 4) The balance between showcasing results and maintaining humility. Create compelling content that drives action through trust and demonstrated value.`,
      userPrompt: `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create a Results & Offers post that highlights meaningful outcomes and encourages ${businessInfo.ideal_client} to explore working with ${businessInfo.business_name}, while positioning the agency as a dependable, trustworthy partner.

IMPORTANT: Generate completely fresh, original content. Avoid starting with "Have you ever" or other overused openings.

Current context: ${currentTime} - Seed: ${randomSeed}

The tone for this post is: ${tone}.
Examples of this tone: ${toneDescription}.
Let this tone shape the style, word choice, and flow naturally.

Use these points as invisible guidance — do not copy them into the post directly:
- The daily pressures their audience faces: ${businessInfo.pain_points}  
- The hidden doubts or hesitations they have before seeking help: ${businessInfo.objections}
- What makes ${businessInfo.business_name} different: ${businessInfo.differentiator}
- The promise they stand by: ${businessInfo.big_promise}

✅ Write a post that feels confident, genuine, and human — aim for about 200-250 words so it provides space for showcasing results and inviting next steps.
✅ Make the post sound natural and sincere, as if ${businessInfo.business_name} is speaking directly to the reader in their chosen tone.
✅ Focus on demonstrating real outcomes and consistent care — no generic filler or overhyped claims.
✅ Use varied, creative openings that showcase success without being pushy
✅ End with a soft, tone-appropriate invitation (e.g., "Curious if we're the right fit? Let's find out — no pressure." or "Reach out — let's explore what's possible.")

Main goal of this post: Build confidence in ${businessInfo.business_name} by showing meaningful results and inviting families to consider working with them.

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
        temperature: 0.8,
        max_tokens: 600,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        top_p: 1
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
  
  hook = hookLines.join(' ').trim();
  body = bodyLines.join(' ').trim();
  cta = ctaLines.join(' ').trim();
  
  return { hook, body, cta };
};

