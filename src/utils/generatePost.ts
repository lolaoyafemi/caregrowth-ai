
import { supabase } from '@/integrations/supabase/client'

export const generatePost = async (userId: string, postType: string, tone: string, platform: string) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !profile) {
      throw new Error('User profile not found.')
    }

    const strategyMap: Record<string, string> = {
      "educational": "Teach something useful about home care...",
      "mission-driven": "Show the heart behind the agency...",
      "heartfelt": "Speak directly to the emotions...",
      "offer-teasers": "Mention a service casually...",
      "faq-style": "Answer a common client question...",
      "promotional": "Clearly highlight a service or offer."
    }

    const strategy = strategyMap[postType] || ""

    const prompt = `
Write a ${postType} post for a home care agency.

Business Name: ${profile.business_name}
Location: ${profile.location}
Ideal Client: ${profile.ideal_client}
Services: ${profile.services}
Main Offer: ${profile.main_offer}
Big Promise: ${profile.big_promise}
Pain Points: ${profile.pain_points?.join(', ')}
Objections: ${profile.objections?.join(', ')}
Differentiator: ${profile.differentiator}
Testimonial: ${profile.testimonial || ''}

Platform: ${platform}
Tone: ${tone}

Write this as a ${postType}.
Here's how to approach it: ${strategy}

Structure:
1. Hook – short, emotional or curiosity-based first line
2. Insight – one truth, story, or tip
3. Soft CTA – comment, message, or learn more

Keep it under 120 words. Sound human, not robotic.
`

    // For now, return a mock response since we need to set up proper API handling
    // In a real implementation, you would call OpenAI API through Supabase Edge Functions
    const mockPost = `🏠 Home care isn't just about medical needs...

It's about preserving dignity, independence, and the comfort of familiar surroundings. At ${profile.business_name || 'our agency'}, we understand that every family's journey is unique.

Our compassionate caregivers don't just provide services – they become trusted companions who genuinely care about your loved one's wellbeing and happiness.

💬 What matters most to you when choosing home care? Share your thoughts below.`

    return { post: mockPost }
  } catch (error) {
    console.error('Error generating post:', error)
    throw error
  }
}
