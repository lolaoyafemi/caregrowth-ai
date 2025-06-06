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

    // Check if user exists in profiles table, create if not
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
      throw new Error('Database error')
    }

    let currentCredits = 0
    
    if (!profile) {
      // Create new profile with credits
      const { error: insertError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          credits: credits,
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Profile insert error:', insertError)
        throw new Error('Failed to create user profile')
      }
      
      currentCredits = credits
    } else {
      // Update existing profile
      currentCredits = (profile.credits || 0) + credits
      
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          credits: currentCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error('Failed to update credits')
      }
    }

    // Log the transaction (optional)
    const { error: logError } = await supabaseClient
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        credits_added: credits,
        plan_name: planName,
        transaction_type: 'free_addition',
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.warn('Transaction log error:', logError)
      // Don't throw error for logging failure
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





// import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// const logStep = (step: string, details?: any) => {
//   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
//   console.log(`[ADD-CREDITS] ${step}${detailsStr}`);
// };

// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     const supabase = createClient(
//       Deno.env.get('SUPABASE_URL')!,
//       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//     );

//     // Get user from auth header
//     const authHeader = req.headers.get('Authorization');
//     if (!authHeader) {
//       throw new Error('No authorization header');
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
//     if (authError || !user?.email) {
//       throw new Error('User not authenticated');
//     }

//     const { credits, planName } = await req.json();

//     if (!credits || !planName) {
//       throw new Error('Missing credits or planName');
//     }

//     logStep('Adding credits directly', { email: user.email, credits, planName });

//     // Find or create user profile
//     let { data: existingProfile, error: profileQueryError } = await supabase
//       .from('user_profiles')
//       .select('*')
//       .eq('email', user.email)
//       .maybeSingle();

//     if (profileQueryError) {
//       logStep('Error querying user profile', { error: profileQueryError });
//       throw new Error('Error querying user profile');
//     }

//     const currentCredits = existingProfile?.credits || 0;
//     const newTotalCredits = currentCredits + credits;

//     if (!existingProfile) {
//       // Create new profile
//       const { error: createError } = await supabase
//         .from('user_profiles')
//         .insert({
//           user_id: user.id,
//           email: user.email,
//           credits: newTotalCredits,
//           plan_name: planName
//         });

//       if (createError) {
//         logStep('Error creating user profile', { error: createError });
//         throw new Error('Error creating user profile');
//       }

//       logStep('Created new user profile with credits', { email: user.email, credits: newTotalCredits });
//     } else {
//       // Update existing profile
//       const { error: updateError } = await supabase
//         .from('user_profiles')
//         .update({
//           credits: newTotalCredits,
//           plan_name: planName
//         })
//         .eq('id', existingProfile.id);

//       if (updateError) {
//         logStep('Error updating user profile', { error: updateError });
//         throw new Error('Error updating user profile');
//       }

//       logStep('Updated user profile with credits', { email: user.email, credits: newTotalCredits });
//     }

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: `Successfully added ${credits} credits`,
//         total_credits: newTotalCredits
//       }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     );

//   } catch (error) {
//     logStep('Error adding credits', { error: error.message });
//     return new Response(
//       JSON.stringify({ success: false, error: error.message }),
//       {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     );
//   }
// });
