

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

// Filter OpenAI settings based on model compatibility
const filterOpenAISettings = (settings: any, model: string) => {
  const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
  const filtered: any = {};
  
  // Parameters supported by all models
  if (settings.top_p !== undefined) filtered.top_p = settings.top_p;
  if (settings.presence_penalty !== undefined) filtered.presence_penalty = settings.presence_penalty;
  if (settings.frequency_penalty !== undefined) filtered.frequency_penalty = settings.frequency_penalty;
  
  // Handle token limits based on model
  if (isNewerModel) {
    // Newer models use max_completion_tokens and don't support temperature
    if (settings.max_tokens !== undefined) {
      filtered.max_completion_tokens = settings.max_tokens;
    } else if (settings.max_completion_tokens !== undefined) {
      filtered.max_completion_tokens = settings.max_completion_tokens;
    }
    
    // Temperature is not supported, so we filter it out
    if (settings.temperature !== undefined) {
      console.log(`Filtering out unsupported temperature parameter for model: ${model}`);
    }
  } else {
    // Legacy models support temperature and use max_tokens
    if (settings.temperature !== undefined) filtered.temperature = settings.temperature;
    if (settings.max_tokens !== undefined) {
      filtered.max_tokens = settings.max_tokens;
    } else if (settings.max_completion_tokens !== undefined) {
      filtered.max_tokens = settings.max_completion_tokens;
    }
  }
  
  console.log(`Filtered settings for model ${model}:`, filtered);
  return filtered;
};

// Get default settings based on model
const getDefaultSettings = (model: string) => {
  const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
  
  if (isNewerModel) {
    return {
      max_completion_tokens: 500,
      top_p: 0.95,
      presence_penalty: 0.3,
      frequency_penalty: 0.4
    };
  } else {
    return {
      max_tokens: 500,
      temperature: 0.7,
      top_p: 0.95,
      presence_penalty: 0.3,
      frequency_penalty: 0.4
    };
  }
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

  // Create Supabase client for database access
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch random prompt from prompts_modified table based on category
  const getRandomPromptByCategory = async (category: string) => {
    const { data: prompts, error } = await supabase
      .from('prompts_modified')
      .select('prompt')
      .eq('category', category);
    
    if (error) {
      console.error('Error fetching prompts:', error);
      return null;
    }
    
    if (!prompts || prompts.length === 0) {
      console.error(`No prompts found for category: ${category}`);
      return null;
    }
    
    // Select random prompt from the array
    const randomIndex = Math.floor(Math.random() * prompts.length);
    return prompts[randomIndex].prompt;
  };

  // Get random prompt for the selected category
  const randomPrompt = await getRandomPromptByCategory(postType);
  
  if (!randomPrompt) {
    console.error(`No prompt found for category: ${postType}. Available categories: trust-authority, heartfelt-relatable, educational-helpful, results-offers`);
    throw new Error(`No prompt found for category: ${postType}. Please use one of: trust-authority, heartfelt-relatable, educational-helpful, results-offers`);
  }

  // Parse and filter OpenAI settings from prompt
  let filteredSettings = {};
  let cleanPrompt = randomPrompt;
  
  const openAISettingsMatch = randomPrompt.match(/OpenAI Settings:\s*(\{[\s\S]*?\})/);
  if (openAISettingsMatch) {
    try {
      const rawSettings = JSON.parse(openAISettingsMatch[1]);
      filteredSettings = filterOpenAISettings(rawSettings, selectedModel);
      // Remove the OpenAI Settings section from the prompt
      cleanPrompt = randomPrompt.replace(/OpenAI Settings:\s*\{[\s\S]*?\}/g, '').trim();
      console.log('Extracted and filtered OpenAI settings:', filteredSettings);
    } catch (e) {
      console.warn('Failed to parse OpenAI settings, using defaults:', e);
      filteredSettings = getDefaultSettings(selectedModel);
    }
  } else {
    filteredSettings = getDefaultSettings(selectedModel);
  }

  // Replace placeholders in the prompt with actual business context
  const processedPrompt = cleanPrompt
    .replace(/\{business_name\}/g, businessInfo.business_name)
    .replace(/\{core_service\}/g, businessInfo.core_service)
    .replace(/\{location\}/g, businessInfo.location)
    .replace(/\{ideal_client\}/g, businessInfo.ideal_client)
    .replace(/\{tone\}/g, tone)
    .replace(/\{tone_description\}/g, toneDescription)
    .replace(/\{pain_points\}/g, businessInfo.pain_points)
    .replace(/\{objections\}/g, businessInfo.objections)
    .replace(/\{differentiator\}/g, businessInfo.differentiator)
    .replace(/\{big_promise\}/g, businessInfo.big_promise)
    .replace(/\{selected_opening\}/g, selectedOpening)
    .replace(/\{current_time\}/g, currentTime)
    .replace(/\{random_seed\}/g, randomSeed)
    .replace(/\{audience\}/g, audience)
    .replace(/\{platform\}/g, platform);

  console.log('Using random prompt from prompts_modified table for category:', postType);
  console.log('Processed prompt with business context:', processedPrompt.substring(0, 200) + '...');

  // Enhanced content category specific prompts optimized for advanced AI reasoning
  const contentPrompts = {
    "trust-authority": {
      systemPrompt: `You are an expert social media strategist with deep understanding of psychology, business positioning, and audience engagement. When using advanced reasoning models, think through: 1) The emotional state of the target audience, 2) The trust-building elements that matter most to them, 3) How to position expertise without appearing boastful, 4) The subtle psychological triggers that build credibility. Create authentic, strategically crafted content that builds trust through genuine expertise demonstration.`,
      userPrompt: processedPrompt
      /* COMMENTED OUT - ORIGINAL HARDCODED PROMPT:
      `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create a Trust & Authority post that demonstrates expertise while building genuine connection with ${businessInfo.ideal_client}.

IMPORTANT: Generate completely fresh, original content. Avoid repetitive openings like "Every day", "Have you ever", "Raise your hand if", or similar patterns. ${selectedOpening}.

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

Return your response in this format format:
HOOK: [compelling opening - 1-2 sentences]
BODY: [valuable main content - 3-5 sentences]
CTA: [clear call-to-action - 1-2 sentences]`
      */
    },
    "heartfelt-relatable": {
      systemPrompt: `You are an expert social media strategist specializing in emotional intelligence and human connection. When using advanced reasoning models, analyze: 1) The deep emotional needs of the audience, 2) The shared experiences that create bonds, 3) The vulnerability level that builds connection without oversharing, 4) The language patterns that evoke empathy. Create deeply resonant content that makes people feel genuinely understood.`,
      userPrompt: processedPrompt
      /* COMMENTED OUT - ORIGINAL HARDCODED PROMPT:
      `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create a Heartfelt & Relatable post that creates genuine emotional connection with ${businessInfo.ideal_client}.

IMPORTANT: Generate completely fresh, original content. Avoid repetitive openings like "Every day", "Have you ever", "Raise your hand if", or similar patterns. ${selectedOpening}.

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

Return your response in this format format:
HOOK: [compelling opening - 1-2 sentences]
BODY: [valuable main content - 3-5 sentences]
CTA: [clear call-to-action - 1-2 sentences]`
      */
    },
    "educational-helpful": {
      systemPrompt: `You are an expert social media strategist and educational content specialist. When using advanced reasoning models, consider: 1) The cognitive load of your audience and optimal information delivery, 2) The learning preferences of busy families, 3) How to make complex information immediately actionable, 4) The balance between depth and accessibility. Create valuable content that genuinely educates while respecting the audience's time and mental bandwidth.`,
      userPrompt: processedPrompt
      /* COMMENTED OUT - ORIGINAL HARDCODED PROMPT:
      `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create an Educational & Helpful post that provides genuine value to ${businessInfo.ideal_client}.

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

Return your response in this format format:
HOOK: [compelling opening - 1-2 sentences]
BODY: [valuable main content - 3-5 sentences]
CTA: [clear call-to-action - 1-2 sentences]`
      */
    },
    "results-offers": {
      systemPrompt: `You are an expert social media strategist with deep expertise in conversion psychology and authentic sales communication. When using advanced reasoning models, analyze: 1) The decision-making psychology of your audience, 2) The objections and hesitations they harbor, 3) The social proof elements that build confidence, 4) The balance between showcasing results and maintaining humility. Create compelling content that drives action through trust and demonstrated value.`,
      userPrompt: processedPrompt
      /* COMMENTED OUT - ORIGINAL HARDCODED PROMPT:
      `You are a thoughtful and creative social media strategist writing for ${businessInfo.business_name}, a ${businessInfo.core_service} provider in ${businessInfo.location}. Your task is to create a Results & Offers post that highlights meaningful outcomes and encourages ${businessInfo.ideal_client} to explore working with ${businessInfo.business_name}, while positioning the agency as a dependable, trustworthy partner.

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

Return your response in this format format:
HOOK: [compelling opening - 1-2 sentences]
BODY: [valuable main content - 3-5 sentences]
CTA: [clear call-to-action - 1-2 sentences]`
      */
    }
  };

  const selectedPrompt = contentPrompts[postType];
  
  if (!selectedPrompt) {
    console.error(`No content prompt found for postType: ${postType}. Available types:`, Object.keys(contentPrompts));
    throw new Error(`Unsupported post type: ${postType}. Available types: ${Object.keys(contentPrompts).join(', ')}`);
  }
  
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
            role: 'user',
            content: processedPrompt
          }
        ],
        // Use filtered OpenAI settings
        ...filteredSettings
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response structure from OpenAI API');
    }
    
    const generatedContent = data.choices[0].message.content;
    console.log('Generated fresh content:', generatedContent);

    if (!generatedContent || generatedContent.trim().length === 0) {
      console.error('Empty content returned from OpenAI');
      throw new Error('Empty content generated by OpenAI');
    }

    const parsed = parseGeneratedContent(generatedContent);
    console.log('Parsed content:', { hook: !!parsed.hook, body: !!parsed.body, cta: !!parsed.cta });
    
    // Ensure we have proper content
    if (parsed.hook && parsed.body && parsed.cta) {
      return {
        ...parsed,
        source: 'enhanced_prompt_ai'
      };
    }
    
    // If parsing fails, provide more detailed error
    console.error('Parsing failed. Content sections found:', {
      hook: parsed.hook ? 'YES' : 'NO',
      body: parsed.body ? 'YES' : 'NO', 
      cta: parsed.cta ? 'YES' : 'NO',
      originalContent: generatedContent
    });
    throw new Error(`Failed to parse generated content properly. Missing: ${!parsed.hook ? 'hook ' : ''}${!parsed.body ? 'body ' : ''}${!parsed.cta ? 'cta' : ''}`);
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

