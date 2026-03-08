import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

// ─── Content Memory ──────────────────────────────────────────────────

export interface ContentMemoryEntry {
  hook: string | null;
  content_anchor: string | null;
  demand_moment_type: string | null;
  post_type: string | null;
  template_style: string | null;
  topic_keywords: string[] | null;
  created_at: string;
}

/**
 * Fetch the most recent 30-50 posts for a user to build Content Memory.
 */
export const getContentMemory = async (supabase: any, userId: string, limit = 50): Promise<ContentMemoryEntry[]> => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('hook, content_anchor, demand_moment_type, post_type, template_style, topic_keywords, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching content memory:', error);
    return [];
  }
  return data || [];
};

/**
 * Extract topic keywords from a caption using common caregiving terms.
 */
export const extractTopicKeywords = (caption: string): string[] => {
  const text = caption.toLowerCase();
  const KEYWORD_PATTERNS = [
    'caregiver burnout', 'dementia support', 'dementia care', 'alzheimer',
    'home care', 'senior loneliness', 'loneliness', 'hospital discharge',
    'medication management', 'respite care', 'respite', 'end of life',
    'hospice', 'family guilt', 'caregiver stress', 'aging parent',
    'elderly care', 'companion care', 'daily assistance', 'meal preparation',
    'personal care', 'fall prevention', 'mobility', 'independence',
    'memory care', 'sundowning', 'wandering', 'nutrition',
    'sleep deprivation', 'family dynamics', 'sibling conflict',
    'long distance caregiving', 'veteran care', 'chronic illness',
    'rehabilitation', 'transitional care', 'palliative care',
    'safety', 'dignity', 'quality of life', 'social isolation',
    'mental health', 'depression', 'anxiety', 'grief', 'loss',
    'trust', 'compassion', 'empathy', 'patience', 'resilience',
  ];

  const found: string[] = [];
  for (const kw of KEYWORD_PATTERNS) {
    if (text.includes(kw) && !found.includes(kw)) {
      found.push(kw);
    }
  }
  return found.slice(0, 8); // cap at 8 keywords
};

/**
 * Build a content memory context string for the AI prompt
 * to avoid repetition in generated content.
 */
export const buildContentMemoryContext = (memory: ContentMemoryEntry[]): string => {
  if (!memory || memory.length === 0) return '';

  // Recent hooks to avoid
  const recentHooks = memory
    .filter(m => m.hook)
    .slice(0, 10)
    .map(m => m.hook);

  // Recent content anchors
  const recentAnchors = memory
    .filter(m => m.content_anchor)
    .slice(0, 5)
    .map(m => m.content_anchor);

  // Recent topic keywords (flatten and count)
  const keywordCounts: Record<string, number> = {};
  memory.slice(0, 20).forEach(m => {
    (m.topic_keywords || []).forEach(kw => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
  });
  const overusedKeywords = Object.entries(keywordCounts)
    .filter(([_, count]) => count >= 3)
    .map(([kw]) => kw);

  // Recent template styles
  const recentTemplates = memory
    .filter(m => m.template_style)
    .slice(0, 5)
    .map(m => m.template_style);

  const lastAnchor = recentAnchors[0] || '';

  let ctx = '\nCONTENT MEMORY — AVOID REPETITION:\n';
  if (recentHooks.length > 0) {
    ctx += `- Do NOT reuse or closely paraphrase these recent hooks:\n${recentHooks.map(h => `  "${h?.substring(0, 80)}"`).join('\n')}\n`;
  }
  if (lastAnchor) {
    ctx += `- The last content anchor used was "${lastAnchor}". Use a DIFFERENT anchor.\n`;
  }
  if (overusedKeywords.length > 0) {
    ctx += `- These topics have been covered recently — avoid or approach from a fresh angle: ${overusedKeywords.join(', ')}\n`;
  }
  ctx += '- Make the opening line (hook) feel distinctly different from recent posts.\n';

  return ctx;
};

export const getUserProfile = async (supabase: any, userId: string) => {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.error('Profile error:', profileError);
  }

  return profile;
};

export const logPostToHistory = async (
  supabase: any,
  userId: string,
  postType: string,
  tone: string,
  platform: string,
  targetAudience: string,
  finalPost: string
) => {
  const { error: insertError } = await supabase
    .from('post_history')
    .insert([{
      user_id: userId,
      prompt_category: postType,
      tone,
      platform,
      audience: targetAudience,
      content: finalPost
    }]);

  if (insertError) {
    console.error('Error inserting to post_history:', insertError);
  }
};
