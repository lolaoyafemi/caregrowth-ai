
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
  "Professional": "Clear, polished, confident, respectful",
  "Conversational": "Warm, friendly, approachable, informal",
  "Enthusiastic": "Positive, energetic, uplifting",
  "Authoritative": "Strong, confident, assured, expert",
  "Humorous": "Light, witty, playful"
  };
  
  // Choose from platform-specific first, then general
  const availablePrompts = platformSpecificPrompts.length > 0 ? platformSpecificPrompts : generalPrompts;
  
  if (availablePrompts.length === 0) {
    return null;
  }

  // Assume you get tone from the frontend client input
  const tone = reqBody.tone; // e.g., "Conversational"
  
  // Lookup tone description
  const toneDescription = toneMap[clientTone] || "Clear and natural tone";

  // Randomly select one row from available prompts
  const selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
  
  console.log('Selected prompt row:', selectedPrompt);

  // Build dynamic prompt
  const prompt = `
You are a creative and compassionate social media strategist writing for ${business_name}, a ${core_service} provider in ${location}. Your job is to create a ${content_category} post designed for ${ideal_client} that builds ${main_goal_of_category}.

The tone for this post is: ${clientTone}.
Examples of this tone: ${toneDescription}.
Write in a way that fits this tone naturally — the reader should *feel* it in the style, word choice, and flow.

Key context to guide your writing (do not mention these directly as filler — use them to shape your ideas and message):  
- The audience’s daily struggles: ${pain_points}
- Common hesitations or objections: ${objections}
- What makes ${business_name} different: ${differentiator}
- The big promise: ${big_promise}

Instructions:
✅ Write a post that feels complete, conversational, and human — not like a template.
✅ Let the post flow naturally (no forced structure like Hook → Body → CTA unless it fits the tone).
✅ Mention ${main_offer} only if it feels natural in the message.
✅ End with a gentle, tone-matching invitation (not pushy or robotic).
✅ Aim for a substantial post that gives value and builds connection — about 150-250 words (or what feels right).

Main goal of this post: Build trust and show ${business_name} as an authority in ${core_service} without sounding salesy.
`;
  
  // Use AI to intelligently rephrase and expand the database prompts for longer, more contextual content
//   const rephrasePrompt = `You are an expert social media storyteller specializing in creating emotionally compelling, longer-form content that deeply resonates with specific audiences. I have a content template that needs to be transformed into a rich, storytelling masterpiece.

// Business Context:
// ${businessContext}

// Original Template:
// HOOK: ${selectedPrompt.hook}
// BODY: ${selectedPrompt.body}
// CTA: ${selectedPrompt.cta}

// Content Category: ${postType}
// Target Audience: ${audience}
// Tone: ${tone}
// Platform: ${platform}

// Transform this template into a captivating story by:

// 1. CREATING A COMPELLING NARRATIVE HOOK (3-4 sentences):
//    - Start with a specific, relatable scenario that "${audience}" immediately recognizes
//    - Use vivid imagery and emotional language that creates an instant connection
//    - Include concrete details that paint a clear picture in the reader's mind
//    - Ask a thought-provoking question or share a surprising insight

// 2. DEVELOPING A RICH STORYTELLING BODY (500-600 words across 6-8 paragraphs):
//    - Tell a complete story with a clear beginning, middle, and emotional resolution
//    - Include specific, realistic scenarios with names, ages, and detailed situations
//    - Paint vivid pictures of before/after transformations
//    - Share authentic moments of struggle, breakthrough, and relief
//    - Use sensory details (what people see, hear, feel) to make scenes come alive
//    - Include specific dialogue or quotes that sound genuine and relatable
//    - Address real fears, hopes, and desires of "${audience}"
//    - Weave in social proof through storytelling rather than direct testimonials
//    - Show the human side of care through specific examples and moments
//    - Create emotional peaks and valleys that keep readers engaged
//    - Use transition phrases that guide readers smoothly through the narrative

// 3. CRAFTING AN INSPIRING CALL-TO-ACTION (3-4 sentences):
//    - Connect directly to the emotional journey you've just shared
//    - Offer hope and a clear next step that feels natural and non-pressured
//    - Include reassurance and remove barriers to taking action
//    - End with warmth and invitation rather than hard selling

// STORYTELLING REQUIREMENTS:
// - Create a cohesive narrative arc that feels like a complete story
// - Use specific examples: "Sarah, a 62-year-old daughter caring for her father with Alzheimer's..."
// - Include emotional moments: describe feelings, concerns, relief, joy
// - Paint scenes with sensory details: "the quiet morning routine," "gentle hands," "peaceful smile"
// - Show real-life situations and transformations
// - Use conversational, warm language with a "${tone}" tone
// - Make it feel personal and intimate while being professional
// - Include realistic timeframes and specific outcomes
// - Address common objections naturally within the story
// - Create multiple emotional connection points throughout
// - Keep placeholders like {business_name}, {ideal_client}, etc. intact
// - Ensure high relevance to "${audience}" with authentic scenarios

// Return the enhanced storytelling version in this exact format:
// HOOK: [compelling narrative hook with 3-4 sentences]
// BODY: [rich storytelling body with 500-600 words across 6-8 paragraphs]
// CTA: [inspiring call-to-action with 3-4 sentences]`;

  try {
    const rephraseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a master storyteller specializing in creating emotionally compelling social media content for "${audience}". You excel at transforming basic templates into rich, engaging narratives that create deep emotional connections and inspire action through authentic storytelling.`
          },
          {
            role: 'user',
            content: rephrasePrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      })
    });

    if (rephraseResponse.ok) {
      const rephraseData = await rephraseResponse.json();
      const rephrasedContent = rephraseData.choices[0].message.content;
      
      console.log('Rephrased content:', rephrasedContent);
      
      const parsed = parseGeneratedContent(rephrasedContent);
      
      if (parsed.hook || parsed.body || parsed.cta) {
        return {
          ...parsed,
          source: 'database_rephrased',
          template_id: selectedPrompt?.id
        };
      }
    }

    console.log('Rephrasing failed, using original template');
    return {
      hook: selectedPrompt.hook || '',
      body: selectedPrompt.body || '',
      cta: selectedPrompt.cta || '',
      source: 'database_original',
      template_id: selectedPrompt?.id
    };
  } catch (rephraseError) {
    console.error('Error rephrasing content:', rephraseError);
    console.log('Using original template as fallback');
    return {
      hook: selectedPrompt.hook || '',
      body: selectedPrompt.body || '',
      cta: selectedPrompt.cta || '',
      source: 'database_original',
      template_id: selectedPrompt?.id
    };
  }
};

export const generateContentWithAI = async (params: ContentGenerationParams): Promise<GeneratedContent> => {
  const { postType, audience, tone, platform, businessContext, openAIApiKey } = params;

  console.log('No prompts found, generating new storytelling content with OpenAI');
  
  const generationPrompt = `You are a master storyteller and social media expert specializing in home care services. Create compelling, story-driven social media content that deeply connects with the target audience.

Business Context:
${businessContext}

Content Category: ${postType}
Target Audience: ${audience}
Tone: ${tone}
Platform: ${platform}

Create a comprehensive, story-driven social media post (550-650 words) that:

STORYTELLING APPROACH:
- Tell a complete, engaging story with characters, conflict, and resolution
- Use specific, realistic scenarios with detailed context
- Include authentic dialogue and genuine emotional moments
- Paint vivid scenes that readers can visualize clearly
- Address real challenges "${audience}" faces through narrative
- Show transformation and hope through storytelling
- Create multiple emotional connection points throughout

NARRATIVE STRUCTURE:

1. COMPELLING STORY HOOK (3-4 sentences):
   - Open with a specific, relatable scenario
   - Use vivid, sensory language that immediately engages
   - Create instant emotional connection with "${audience}"
   - Include a compelling question or surprising insight

2. RICH STORYTELLING BODY (500-550 words across 6-8 paragraphs):
   - Develop a complete narrative arc with clear progression
   - Include specific characters with names, ages, and backgrounds
   - Show real struggles, emotions, and breakthrough moments
   - Use dialogue and quoted thoughts to add authenticity
   - Paint detailed scenes with sensory descriptions
   - Address common fears and hopes through the story
   - Demonstrate expertise through narrative examples
   - Show before/after transformations with specific details
   - Include realistic timeframes and outcomes
   - Weave in social proof naturally through storytelling
   - Use smooth transitions between scenes and ideas

3. INSPIRING CALL-TO-ACTION (3-4 sentences):
   - Connect emotionally to the story just shared
   - Offer clear, achievable next steps
   - Remove barriers and provide reassurance
   - End with warmth and genuine invitation

CONTENT REQUIREMENTS:
- Create authentic, relatable scenarios for "${audience}"
- Use "${tone}" tone while maintaining warmth and professionalism
- Include specific, realistic examples and outcomes
- Address emotional needs and practical concerns
- Optimize for ${platform} engagement with platform-appropriate language
- Show genuine care and understanding throughout
- Use storytelling to educate and inspire rather than just sell

Format your response as:
HOOK: [compelling story hook with 3-4 sentences]
BODY: [rich storytelling content with 500-550 words across 6-8 paragraphs]
CTA: [inspiring call-to-action with 3-4 sentences]`;

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
            content: `You are a master storyteller specializing in emotionally compelling home care content. Create rich, engaging narratives that deeply resonate with "${audience}" using authentic storytelling, specific examples, and genuine emotional connection.`
          },
          {
            role: 'user',
            content: generationPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2200
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
          hook: contentLines[0] || 'Looking for reliable home care services?',
          body: contentLines.slice(1, -1).join('\n') || 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we are here to help navigate those difficult decisions with expertise and understanding.',
          cta: contentLines[contentLines.length - 1] || 'Contact us today to learn more about how we can support your family!',
          source: 'ai_generated'
        };
      } else {
        return {
          hook: 'Looking for reliable home care services?',
          body: 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we are here to help navigate those difficult decisions with expertise and understanding.',
          cta: 'Contact us today to learn more about how we can support your family!',
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
      hook: 'Looking for reliable home care services?',
      body: 'Our team provides compassionate, professional care for your loved ones with years of experience and a commitment to excellence. We understand the challenges families face when seeking quality care, and we are here to help navigate those difficult decisions with expertise and understanding.',
      cta: 'Contact us today to learn more about how we can support your family!',
      source: 'ai_generated'
    };
  }
};

export const parseGeneratedContent = (content: string): { hook: string; body: string; cta: string } => {
  let hook = '', body = '', cta = '';
  
  // Parse the content and remove formatting labels
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('hook:')) {
      hook = line.replace(/^hook:\s*/i, '').trim();
    } else if (lowerLine.startsWith('body:')) {
      body = line.replace(/^body:\s*/i, '').trim();
    } else if (lowerLine.startsWith('cta:')) {
      cta = line.replace(/^cta:\s*/i, '').trim();
    }
  }
  
  return { hook, body, cta };
};
