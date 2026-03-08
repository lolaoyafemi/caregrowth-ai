

// ─── Caregiving Reality Map ──────────────────────────────────────────
// Real situations families face — used to ground AI content in authenticity

const CAREGIVING_REALITY_MAP = [
  {
    situation: 'caregiver_burnout',
    label: 'Caregiver Burnout',
    emotions: ['exhaustion', 'guilt', 'isolation', 'resentment', 'grief'],
    scenarios: [
      'A daughter who hasn\'t slept through the night in months',
      'A spouse who forgot what their own hobbies used to be',
      'A son who snaps at his mother and immediately hates himself for it',
    ],
  },
  {
    situation: 'hospital_discharge',
    label: 'Hospital Discharge Stress',
    emotions: ['panic', 'overwhelm', 'confusion', 'fear'],
    scenarios: [
      'Getting a call that Mom is being discharged tomorrow — and nobody has a plan',
      'Reading a 12-page discharge packet while running on no sleep',
      'Being told "she can\'t live alone anymore" with zero guidance on what\'s next',
    ],
  },
  {
    situation: 'dementia_care',
    label: 'Dementia Care Challenges',
    emotions: ['heartbreak', 'frustration', 'loss', 'love', 'patience'],
    scenarios: [
      'Dad asking "who are you?" for the first time',
      'Repeating the same conversation for the fifth time today — and choosing kindness again',
      'Watching someone you love slowly become someone you don\'t recognize',
    ],
  },
  {
    situation: 'medication_management',
    label: 'Medication Reminders',
    emotions: ['worry', 'responsibility', 'stress'],
    scenarios: [
      'Wondering if Mom took her pills today — from 200 miles away',
      'Sorting 14 medications into weekly pill boxes every Sunday',
      'Getting a call from the pharmacy about a missed refill',
    ],
  },
  {
    situation: 'senior_loneliness',
    label: 'Loneliness in Seniors',
    emotions: ['sadness', 'worry', 'helplessness', 'compassion'],
    scenarios: [
      'Calling Dad and realizing you\'re the only person he talked to all week',
      'A senior eating dinner alone every night after losing their spouse',
      'Noticing the TV is always on — not for entertainment, just for a voice in the room',
    ],
  },
  {
    situation: 'family_guilt',
    label: 'Family Guilt About Asking for Help',
    emotions: ['shame', 'conflict', 'obligation', 'relief'],
    scenarios: [
      'Feeling like a failure for not being able to "do it all"',
      'Siblings fighting about who should be doing more',
      'Thinking "I should be the one caring for her — not a stranger"',
    ],
  },
  {
    situation: 'end_of_life',
    label: 'End-of-Life Transitions',
    emotions: ['grief', 'peace', 'love', 'fear', 'acceptance'],
    scenarios: [
      'Wanting to make sure their last days feel like home',
      'Having the conversation nobody wants to have',
      'Choosing comfort over treatment — and wondering if it\'s the right call',
    ],
  },
  {
    situation: 'respite_need',
    label: 'Need for Respite',
    emotions: ['exhaustion', 'hope', 'relief', 'guilt'],
    scenarios: [
      'A caregiver who hasn\'t taken a vacation in three years',
      'Needing just one afternoon to go to a doctor\'s appointment alone',
      'Feeling guilty for wanting a break from someone you love',
    ],
  },
];

// ─── Content Anchors ─────────────────────────────────────────────────
// Predefined themes that guide every generated post

export const CONTENT_ANCHORS = [
  {
    anchor: 'family_reality',
    label: 'Family Reality',
    instruction: 'Write about a real caregiving situation families face. Use specific, emotionally resonant scenarios — not abstract statements. The reader should think "that\'s exactly what I\'m going through."',
  },
  {
    anchor: 'education',
    label: 'Caregiver Education',
    instruction: 'Teach the audience something useful about caregiving. Share a specific tip, early warning sign, or little-known fact. Position the agency as a knowledgeable guide — not a salesperson.',
  },
  {
    anchor: 'reassurance',
    label: 'Reassurance',
    instruction: 'Write a post that makes caregivers feel seen, supported, and less alone. No selling. No CTA. Just genuine emotional encouragement that they\'re doing a good job and it\'s okay to need help.',
  },
  {
    anchor: 'myth_vs_truth',
    label: 'Myth vs Truth',
    instruction: 'Start with a common myth or misconception about home care, aging, or caregiving. Then gently correct it with the truth. The tone should be informative, not condescending.',
  },
  {
    anchor: 'behind_the_scenes',
    label: 'Behind the Scenes',
    instruction: 'Give insight into the real work of professional caregiving. Show the human side — the training, the small moments of connection, the dedication. Make the reader appreciate what caregivers do every day.',
  },
  {
    anchor: 'soft_invitation',
    label: 'Soft Invitation',
    instruction: 'Write a warm, low-pressure post that invites the reader to take a small step — like saving the post, visiting the website, or sending a message. The CTA should feel like an invitation, not a sales pitch.',
  },
] as const;

export type ContentAnchor = typeof CONTENT_ANCHORS[number]['anchor'];

// ─── Engagement Hooks ────────────────────────────────────────────────
// Short questions or reflective prompts to encourage comments (~40% of posts)

export const ENGAGEMENT_HOOKS = [
  {
    type: 'reflection',
    label: 'Reflection Hook',
    examples: [
      'Does this sound familiar in your family?',
      'Have you ever felt this way as a caregiver?',
      'Does this remind you of someone you love?',
    ],
  },
  {
    type: 'experience',
    label: 'Experience Hook',
    examples: [
      'Have you ever seen someone go through this?',
      'What was your experience the first time you needed help?',
      'Has your family faced a moment like this?',
    ],
  },
  {
    type: 'opinion',
    label: 'Opinion Hook',
    examples: [
      'Do you think families wait too long before asking for help?',
      'What do you wish more people understood about caregiving?',
      'Do you agree that asking for help is a sign of strength?',
    ],
  },
  {
    type: 'awareness',
    label: 'Awareness Hook',
    examples: [
      'What signs helped you realize extra support might help?',
      'Did you know this about home care?',
      'What was the first sign that told you something had changed?',
    ],
  },
  {
    type: 'soft_response',
    label: 'Soft Response Hook',
    examples: [
      'If this resonates with you, you\'re not alone.',
      'Tag someone who needs to hear this today.',
      'Save this for when you need a reminder.',
    ],
  },
] as const;

/**
 * Determine if a post should include an engagement hook (~40% chance)
 * and select one aligned with the content anchor.
 */
export function selectEngagementHook(postIndex: number, contentAnchor: string): { type: string; prompt: string } | null {
  // Use a deterministic pseudo-random based on postIndex to get ~40%
  const shouldInclude = ((postIndex * 7 + 3) % 10) < 4; // 0,1,2,3 → true (40%)
  if (!shouldInclude) return null;

  // Map anchors to preferred hook types for contextual alignment
  const anchorHookMap: Record<string, string[]> = {
    family_reality: ['reflection', 'experience'],
    education: ['awareness', 'opinion'],
    reassurance: ['soft_response', 'reflection'],
    myth_vs_truth: ['opinion', 'awareness'],
    behind_the_scenes: ['experience', 'reflection'],
    soft_invitation: ['soft_response', 'experience'],
  };

  const preferredTypes = anchorHookMap[contentAnchor] || ['reflection', 'soft_response'];
  const selectedType = preferredTypes[postIndex % preferredTypes.length];
  const hookDef = ENGAGEMENT_HOOKS.find(h => h.type === selectedType) || ENGAGEMENT_HOOKS[0];
  const example = hookDef.examples[postIndex % hookDef.examples.length];

  return { type: hookDef.type, prompt: example };
}

// ─── Demand Moments ──────────────────────────────────────────────────
// Natural CTAs that encourage families to consider reaching out (~every 4-5 posts)

export const DEMAND_MOMENTS = [
  {
    type: 'recognition',
    label: 'Recognition Moment',
    templates: [
      'If your family is starting to feel overwhelmed with caregiving, it may be time to explore extra support.',
      'When daily tasks start feeling heavier than usual, it could be a sign that additional help would make a difference.',
      'If you\'re noticing changes in your loved one\'s needs, you\'re not imagining it — and you don\'t have to figure it out alone.',
    ],
  },
  {
    type: 'education',
    label: 'Education Moment',
    templates: [
      'Many families think home care is only for serious medical needs, but most visits involve companionship, meals, and daily assistance.',
      'Did you know that most home care starts with just a few hours a week? It\'s more flexible than most families expect.',
      'Home care isn\'t about replacing family — it\'s about giving families the support they need to stay connected.',
    ],
  },
  {
    type: 'relief',
    label: 'Relief Moment',
    templates: [
      'The first night families know their loved one is supported is often the first night they sleep peacefully.',
      'Families often tell us the hardest part wasn\'t asking for help — it was waiting so long to do it.',
      'There\'s a moment when caregivers realize they can breathe again. That moment is worth everything.',
    ],
  },
  {
    type: 'invitation',
    label: 'Invitation Moment',
    templates: [
      'If your family is navigating something similar right now, we\'re here to talk.',
      'No pressure, no commitment — just a conversation about what support could look like for your family.',
      'Whenever you\'re ready, we\'re here. Even if it\'s just to ask a question.',
    ],
  },
] as const;

/**
 * Determine if a post should be a demand moment (~every 4-5 posts).
 * Returns the moment type and text, or null.
 */
export function selectDemandMoment(postIndex: number): { type: string; text: string } | null {
  // Every 4-5 posts: trigger on indices 3, 8, 12, 17, 21, ...
  // Pattern: offset 3, then every 5
  if (postIndex < 3) return null;
  if ((postIndex - 3) % 5 !== 0) return null;

  const momentIdx = Math.floor((postIndex - 3) / 5);
  const moment = DEMAND_MOMENTS[momentIdx % DEMAND_MOMENTS.length];
  const template = moment.templates[momentIdx % moment.templates.length];

  return { type: moment.type, text: template };
}

/**
 * Select a content anchor for the current post based on index.
 */
export function selectContentAnchor(postIndex: number): typeof CONTENT_ANCHORS[number] {
  return CONTENT_ANCHORS[postIndex % CONTENT_ANCHORS.length];
}

/**
 * Build the caregiving context block to inject into AI prompts.
 */
export function buildCaregivingContext(postIndex: number): string {
  const reality = selectCaregivingReality(postIndex);
  const anchor = selectContentAnchor(postIndex);
  const scenario = reality.scenarios[postIndex % reality.scenarios.length];

  return `
CAREGIVING REALITY TO REFERENCE:
Situation: ${reality.label}
Emotions families feel: ${reality.emotions.join(', ')}
Real scenario to draw from: "${scenario}"

CONTENT ANCHOR FOR THIS POST: ${anchor.label}
${anchor.instruction}

IMPORTANT: Ground this post in the caregiving reality above. Reference the real emotions and situations — not generic marketing language. The reader should think "they understand what I\'m going through."`;
}

export const buildBusinessContext = (profile: any, audience: string): string => {
  const targetAudience = audience || (profile?.ideal_client || 'families needing care');
  
  return profile ? `
Business Name: ${profile.business_name || 'Home Care Business'}
Services: ${profile.services || profile.core_service || 'Home care services'}
Service Area: ${profile.service_area || profile.location || 'Local area'}
Location: ${profile.location || 'Local area'}
Phone Number: ${profile.phone_number || 'Contact us for more information'}
Target Client: ${targetAudience}
Main Offer: ${profile.main_offer || 'Professional home care'}
Differentiator: ${profile.differentiator || 'Compassionate, professional care'}
Big Promise: ${profile.big_promise || 'Exceptional care for your loved ones'}
Client Pain Points: ${Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : profile.pain_points || 'Finding reliable care'}
Audience Problems: ${profile.audience_problem || 'Caregiving challenges'}
Objections: ${Array.isArray(profile.objections) ? profile.objections.join(', ') : profile.objections || 'Cost and trust concerns'}
Testimonial: ${profile.testimonial || 'Trusted by families in our community'}
Tone Preference: ${profile.tone_preference || 'warm and empathetic'}
` : 'Home Care Business providing professional care services';
};

export const personalizeContent = (text: string, profile: any, targetAudience: string, tone: string, platform: string): string => {
  if (!profile || !text) return text;
  
  return text
    .replace(/\{business_name\}/gi, profile.business_name || 'our business')
    .replace(/\{location\}/gi, profile.location || 'your area')
    .replace(/\{service_area\}/gi, profile.service_area || profile.location || 'your area')
    .replace(/\{services\}/gi, profile.services || 'our services')
    .replace(/\{core_service\}/gi, profile.core_service || 'our services')
    .replace(/\{phone_number\}/gi, profile.phone_number || 'contact us')
    .replace(/\{ideal_client\}/gi, targetAudience)
    .replace(/\{main_offer\}/gi, profile.main_offer || 'our services')
    .replace(/\{differentiator\}/gi, profile.differentiator || 'professional care')
    .replace(/\{big_promise\}/gi, profile.big_promise || 'exceptional care')
    .replace(/\{pain_points\}/gi, Array.isArray(profile.pain_points) ? profile.pain_points.join(', ') : 'common challenges')
    .replace(/\{audience_problem\}/gi, profile.audience_problem || 'caregiving challenges')
    .replace(/\{objections\}/gi, Array.isArray(profile.objections) ? profile.objections.join(', ') : 'common concerns')
    .replace(/\{audience\}/gi, targetAudience)
    .replace(/\{tone\}/gi, tone || 'professional')
    .replace(/\{tone_preference\}/gi, profile.tone_preference || 'warm')
    .replace(/\{platform\}/gi, platform || 'social media')
    .replace(/\{testimonial\}/gi, profile.testimonial || 'trusted by our community');
};
