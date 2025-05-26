import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' })

  const { user_id, post_type, tone, platform } = req.body

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (error || !profile) {
    return res.status(400).json({ error: 'User profile not found.' })
  }

  const strategyMap: Record<string, string> = {
    "Educational posts": "Teach something useful about home care...",
    "Mission-driven posts": "Show the heart behind the agency...",
    "Heartfelt & relatable": "Speak directly to the emotions...",
    "Offer teasers": "Mention a service casually...",
    "FAQ-style": "Answer a common client question...",
    "Promotional posts": "Clearly highlight a service or offer."
  }

  const strategy = strategyMap[post_type] || ""

  const prompt = `
Write a ${post_type} post for a home care agency.

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

Write this as a ${post_type}.
Here’s how to approach it: ${strategy}

Structure:
1. Hook – short, emotional or curiosity-based first line
2. Insight – one truth, story, or tip
3. Soft CTA – comment, message, or learn more

Keep it under 120 words. Sound human, not robotic.
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a skilled social media writer for home care agencies.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 300
  })

  const post = response.choices[0].message.content
  res.status(200).json({ post })
}
