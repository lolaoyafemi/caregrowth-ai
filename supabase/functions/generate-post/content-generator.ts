

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
  content: string;
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
    try {
      if (!category) {
        console.error('Category is required for prompt fetching');
        return null;
      }

      const { data: prompts, error } = await supabase
        .from('prompts_modified')
        .select('prompt')
        .eq('category', category);
      
      if (error) {
        console.error('Database error fetching prompts:', error.message);
        return null;
      }
      
      if (!prompts || prompts.length === 0) {
        console.log(`No prompts found for category: ${category}`);
        return null;
      }
      
      // Select random prompt
      const randomIndex = Math.floor(Math.random() * prompts.length);
      const selectedPrompt = prompts[randomIndex]?.prompt;
      
      if (!selectedPrompt) {
        console.error('Selected prompt is empty or undefined');
        return null;
      }
      
      return selectedPrompt;
    } catch (error) {
      console.error('Unexpected error in getRandomPromptByCategory:', error.message);
      return null;
    }
  };

  // Get random prompt from database
  let randomPrompt;
  try {
    randomPrompt = await getRandomPromptByCategory(postType);
  } catch (error) {
    console.error('Error getting random prompt:', error.message);
    throw new Error(`Failed to fetch prompt for category: ${postType}`);
  }
  
  if (!randomPrompt || randomPrompt.trim() === '') {
    console.log(`Falling back to hardcoded prompts for category: ${postType}`);
    throw new Error(`No valid prompt found for category: ${postType}. Please use one of: trust-authority, heartfelt-relatable, educational-helpful, results-offers`);
  }

  // Parse and filter OpenAI settings from prompt
  let filteredSettings = {};
  let cleanPrompt = randomPrompt;
  
  try {
    const openAISettingsMatch = randomPrompt.match(/OpenAI Settings:\s*(\{[\s\S]*?\})/);
    if (openAISettingsMatch && openAISettingsMatch[1]) {
      try {
        const rawSettings = JSON.parse(openAISettingsMatch[1]);
        if (rawSettings && typeof rawSettings === 'object') {
          filteredSettings = filterOpenAISettings(rawSettings, selectedModel);
          // Remove the OpenAI Settings section from the prompt
          cleanPrompt = randomPrompt.replace(/OpenAI Settings:\s*\{[\s\S]*?\}/g, '').trim();
          console.log('Extracted and filtered OpenAI settings:', filteredSettings);
        } else {
          console.warn('Invalid OpenAI settings format, using defaults');
          filteredSettings = getDefaultSettings(selectedModel);
        }
      } catch (parseError) {
        console.warn('Failed to parse OpenAI settings JSON, using defaults:', parseError.message);
        filteredSettings = getDefaultSettings(selectedModel);
      }
    } else {
      filteredSettings = getDefaultSettings(selectedModel);
    }
  } catch (error) {
    console.error('Error processing OpenAI settings:', error.message);
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

  // Enhanced content category specific prompts optimized for direct content generation
  const contentPrompts = {
    "trust-authority": {
      systemPrompt: `You are an expert social media strategist with deep understanding of psychology, business positioning, and audience engagement. Create authentic, strategically crafted content that builds trust through genuine expertise demonstration. Generate a single, cohesive social media post without breaking it into sections.`,
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
      systemPrompt: `You are an expert social media strategist specializing in emotional intelligence and human connection. Create deeply resonant content that makes people feel genuinely understood. Generate a single, cohesive social media post that creates authentic emotional connection.`,
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
      systemPrompt: `You are an expert social media strategist and educational content specialist. Create valuable content that genuinely educates while respecting the audience's time and mental bandwidth. Generate a single, cohesive social media post that provides actionable value.`,
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
      systemPrompt: `You are an expert social media strategist with deep expertise in conversion psychology and authentic sales communication. Create compelling content that drives action through trust and demonstrated value. Generate a single, cohesive social media post that showcases results and encourages engagement.`,
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
    console.log(`Making OpenAI API call with model: ${selectedModel}`);
    
    // Validate required parameters before API call
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    if (!selectedModel) {
      throw new Error('Model selection failed');
    }
    
    if (!contentPrompts[postType]) {
      throw new Error(`Content prompt not found for post type: ${postType}`);
    }
    
    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: contentPrompts[postType].systemPrompt || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: processedPrompt || 'Generate social media content.'
        }
      ],
      // Use filtered OpenAI settings
      ...filteredSettings
    };
    
    console.log('OpenAI request body:', JSON.stringify(requestBody, null, 2));
    
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (fetchError) {
      console.error('Network error calling OpenAI API:', fetchError.message);
      throw new Error(`Network error: ${fetchError.message}`);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse error response:', jsonError.message);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse OpenAI response:', jsonError.message);
      throw new Error('Invalid JSON response from OpenAI API');
    }
    
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response structure from OpenAI API');
    }
    
    if (!data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Missing content in OpenAI response:', data.choices[0]);
      throw new Error('No content received from OpenAI API');
    }
    
    const generatedContent = data.choices[0].message.content;
    console.log('Generated content:', generatedContent);

    if (!generatedContent || generatedContent.trim().length === 0) {
      console.error('Empty content returned from OpenAI');
      throw new Error('Empty content generated by OpenAI');
    }

    // Return the content directly without parsing into sections
    return {
      content: generatedContent.trim(),
      source: 'enhanced_prompt_ai'
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
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
  console.log('Parsing content:', content.substring(0, 300) + '...');
  
  let hook = '', body = '', cta = '';
  
  // First try to extract using structured format (HOOK:, BODY:, CTA:)
  const hookMatch = content.match(/(?:^|\n)\s*(?:\*{0,2})?hook:\s*(?:\*{0,2})?\s*(.*?)(?=\n\s*(?:\*{0,2})?(?:body|cta):|$)/is);
  const bodyMatch = content.match(/(?:^|\n)\s*(?:\*{0,2})?body:\s*(?:\*{0,2})?\s*(.*?)(?=\n\s*(?:\*{0,2})?cta:|$)/is);
  const ctaMatch = content.match(/(?:^|\n)\s*(?:\*{0,2})?cta:\s*(?:\*{0,2})?\s*(.*?)$/is);
  
  if (hookMatch) hook = hookMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  if (bodyMatch) body = bodyMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  if (ctaMatch) cta = ctaMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  // If structured parsing failed, try fallback approach
  if (!hook || !body || !cta) {
    console.log('Structured parsing failed, trying fallback approach');
    
    // Split content by lines and clean up
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentSection = '';
    let hookLines = [];
    let bodyLines = [];
    let ctaLines = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Handle various formats
      if (lowerLine.includes('hook') && (lowerLine.includes(':') || lowerLine.includes('**'))) {
        currentSection = 'hook';
        const hookContent = line.replace(/^.*?(?:hook[:*\s]+|hook)\s*/i, '').trim();
        if (hookContent) hookLines.push(hookContent);
      } else if (lowerLine.includes('body') && (lowerLine.includes(':') || lowerLine.includes('**'))) {
        currentSection = 'body';
        const bodyContent = line.replace(/^.*?(?:body[:*\s]+|body)\s*/i, '').trim();
        if (bodyContent) bodyLines.push(bodyContent);
      } else if (lowerLine.includes('cta') && (lowerLine.includes(':') || lowerLine.includes('**'))) {
        currentSection = 'cta';
        const ctaContent = line.replace(/^.*?(?:cta[:*\s]+|cta)\s*/i, '').trim();
        if (ctaContent) ctaLines.push(ctaContent);
      } else if (line && currentSection) {
        // Add content to current section
        if (currentSection === 'hook') hookLines.push(line);
        else if (currentSection === 'body') bodyLines.push(line);
        else if (currentSection === 'cta') ctaLines.push(line);
      }
    }
    
    // Only update if we found better content
    if (!hook && hookLines.length > 0) hook = hookLines.join(' ').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    if (!body && bodyLines.length > 0) body = bodyLines.join(' ').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    if (!cta && ctaLines.length > 0) cta = ctaLines.join(' ').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  }
  
  // Final fallback: if still missing parts, try to extract from unstructured content
  if (!hook || !body || !cta) {
    console.log('Both parsing methods failed, using emergency fallback');
    
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    
    if (!hook && sentences.length > 0) {
      hook = sentences[0] + (sentences[0].endsWith('.') ? '' : '.');
    }
    
    if (!body && sentences.length > 1) {
      const bodyStart = hook ? 1 : 0;
      const bodyEnd = sentences.length > 3 ? sentences.length - 1 : sentences.length;
      body = sentences.slice(bodyStart, bodyEnd).join('. ') + '.';
    }
    
    if (!cta && sentences.length > 0) {
      cta = sentences[sentences.length - 1] + (sentences[sentences.length - 1].endsWith('.') ? '' : '.');
    }
  }
  
  console.log('Final parsed sections:', {
    hook: hook ? 'YES (' + hook.length + ' chars)' : 'NO',
    body: body ? 'YES (' + body.length + ' chars)' : 'NO',
    cta: cta ? 'YES (' + cta.length + ' chars)' : 'NO'
  });
  
  return { hook, body, cta };
};

