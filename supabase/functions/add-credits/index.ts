
// supabase/functions/add-credits/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid user token')
    }

    // Parse request body
    const { credits, planName } = await req.json()

    if (!credits || typeof credits !== 'number') {
      throw new Error('Invalid credits amount')
    }

    console.log('Adding credits for user:', user.email, 'Credits:', credits)

    // Check if user exists in user_profiles table, create if not
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      throw new Error('Database error fetching profile')
    }

    let currentCredits = 0
    
    if (!profile) {
      // Create new profile with credits
      const { error: insertError } = await supabaseClient
        .from('user_profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          credits: credits,
          plan_name: planName,
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Profile insert error:', insertError)
        throw new Error('Failed to create user profile')
      }
      
      currentCredits = credits
      console.log('Created new user profile with credits:', currentCredits)
    } else {
      // Update existing profile
      currentCredits = (profile.credits || 0) + credits
      
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({
          credits: currentCredits,
          plan_name: planName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error('Failed to update credits')
      }
      
      console.log('Updated user profile with credits:', currentCredits)
    }

    // Also update the users table if it exists
    const { error: usersUpdateError } = await supabaseClient
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        credits: currentCredits,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      })

    if (usersUpdateError) {
      console.warn('Users table update error (non-critical):', usersUpdateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_added: credits,
        total_credits: currentCredits,
        message: `Successfully added ${credits} credits`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
