/**
 * Content Intent System
 * 
 * Maps user-facing categories to internal strategic intents.
 * The system selects the right category based on visibility state,
 * engagement signals, and lead detection — the user doesn't choose.
 */

export type ContentIntent = 'visibility' | 'engagement' | 'authority' | 'conversion' | 'lead_activation';

export interface ContentCategory {
  label: string;
  intent: ContentIntent;
  postType: string;         // sent to generate-post as postType
  description: string;
}

export const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    label: 'Educational & Helpful',
    intent: 'visibility',
    postType: 'educational',
    description: 'Stay visible with helpful, shareable content',
  },
  {
    label: 'Heartfelt & Relatable',
    intent: 'engagement',
    postType: 'heartfelt',
    description: 'Spark emotional connection and comments',
  },
  {
    label: 'Trust & Authority',
    intent: 'authority',
    postType: 'authority',
    description: 'Build credibility and professional trust',
  },
  {
    label: 'Results & Offers',
    intent: 'conversion',
    postType: 'conversion',
    description: 'Drive action with results, testimonials, and offers',
  },
  {
    label: 'Conversation & Leads',
    intent: 'lead_activation',
    postType: 'lead_activation',
    description: 'Start conversations that surface potential clients',
  },
];

/**
 * Strategic tone pairing per intent
 */
const INTENT_TONES: Record<ContentIntent, string[]> = {
  visibility: ['conversational', 'enthusiastic', 'professional'],
  engagement: ['conversational', 'warm', 'empathetic'],
  authority: ['authoritative', 'professional', 'confident'],
  conversion: ['professional', 'enthusiastic', 'direct'],
  lead_activation: ['conversational', 'warm', 'curious'],
};

export function getToneForIntent(intent: ContentIntent, index: number): string {
  const tones = INTENT_TONES[intent];
  return tones[index % tones.length];
}

/**
 * Smart category selection based on system state.
 * Priority: risk → low engagement → leads → balanced rotation
 */
export interface SystemState {
  visibilityLevel: 'good' | 'warning' | 'risk';
  queueCount: number;
  hasUnrepliedComments?: boolean;
  recentEngagementLow?: boolean;
  leadsDetected?: boolean;
}

export function selectIntentForState(state: SystemState, postIndex: number): ContentCategory {
  // Risk state → prioritize visibility
  if (state.visibilityLevel === 'risk' || state.queueCount === 0) {
    return CONTENT_CATEGORIES.find(c => c.intent === 'visibility')!;
  }

  // Low engagement → heartfelt content
  if (state.recentEngagementLow) {
    return CONTENT_CATEGORIES.find(c => c.intent === 'engagement')!;
  }

  // Leads detected → conversion or lead activation
  if (state.leadsDetected) {
    return postIndex % 2 === 0
      ? CONTENT_CATEGORIES.find(c => c.intent === 'conversion')!
      : CONTENT_CATEGORIES.find(c => c.intent === 'lead_activation')!;
  }

  // Warning state → mix visibility and authority
  if (state.visibilityLevel === 'warning') {
    const warningRotation: ContentIntent[] = ['visibility', 'authority', 'visibility', 'engagement'];
    const intent = warningRotation[postIndex % warningRotation.length];
    return CONTENT_CATEGORIES.find(c => c.intent === intent)!;
  }

  // Good state → balanced strategic rotation
  const balancedRotation: ContentIntent[] = [
    'visibility',
    'engagement',
    'authority',
    'lead_activation',
    'visibility',
    'engagement',
    'conversion',
    'authority',
  ];
  const intent = balancedRotation[postIndex % balancedRotation.length];
  return CONTENT_CATEGORIES.find(c => c.intent === intent)!;
}

/**
 * "Give me another angle" — strategic intent switching, not random.
 * Cycles through a deliberate sequence so each angle feels purposeful.
 */
const ANGLE_CYCLE: ContentIntent[] = [
  'engagement',
  'authority',
  'lead_activation',
  'conversion',
  'visibility',
];

export function getNextAngleIntent(currentIntent: ContentIntent): ContentCategory {
  const currentIndex = ANGLE_CYCLE.indexOf(currentIntent);
  const nextIndex = (currentIndex + 1) % ANGLE_CYCLE.length;
  const nextIntent = ANGLE_CYCLE[nextIndex];
  return CONTENT_CATEGORIES.find(c => c.intent === nextIntent)!;
}

/**
 * Build a strategic batch rotation for multi-day content generation.
 * Returns an array of categories that creates a natural, strategic flow.
 */
export function buildBatchRotation(totalPosts: number, state: SystemState): ContentCategory[] {
  const categories: ContentCategory[] = [];
  for (let i = 0; i < totalPosts; i++) {
    categories.push(selectIntentForState(state, i));
  }
  return categories;
}
