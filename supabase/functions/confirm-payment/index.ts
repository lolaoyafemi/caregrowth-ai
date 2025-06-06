
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2022-11-15'
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');

    console.log('Processing payment confirmation for session:', session_id);

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing session_id' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Stripe session retrieved:', session.id, 'Payment status:', session.payment_status);

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not completed' }),
        { 
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get customer email
    const customerEmail = session.customer_email || session.customer_details?.email;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'No customer email found' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing payment for email:', customerEmail);

    // Find the pending payment record
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_session_id', session_id)
      .eq('status', 'pending')
      .single();

    if (paymentError || !paymentRecord) {
      console.error('Payment record not found:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment record not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Found payment record:', paymentRecord.id, 'Credits:', paymentRecord.credits_granted);

    // Find or create user by email
    let { data: existingUser, error: userQueryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', customerEmail)
      .maybeSingle();

    if (userQueryError) {
      console.error('Error querying user:', userQueryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error querying user' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let userId = existingUser?.id;

    if (!existingUser) {
      // Create new user if doesn't exist
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          email: customerEmail,
          credits: paymentRecord.credits_granted,
          plan: paymentRecord.plan_name.toLowerCase(),
          name: session.customer_details?.name || null
        })
        .select()
        .single();

      if (createUserError || !newUser) {
        console.error('Error creating user:', createUserError);
        return new Response(
          JSON.stringify({ success: false, error: 'Error creating user' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      userId = newUser.id;
      console.log('Created new user:', userId, 'with credits:', paymentRecord.credits_granted);
    } else {
      // Update existing user's credits and plan
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          credits: (existingUser.credits || 0) + paymentRecord.credits_granted,
          plan: paymentRecord.plan_name.toLowerCase()
        })
        .eq('id', existingUser.id);

      if (updateUserError) {
        console.error('Error updating user credits:', updateUserError);
        return new Response(
          JSON.stringify({ success: false, error: 'Error updating user credits' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('Updated existing user:', userId, 'added credits:', paymentRecord.credits_granted);
    }

    // Update payment record status to completed and link to user
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRecord.id);

    if (updatePaymentError) {
      console.error('Error updating payment status:', updatePaymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error updating payment status' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Payment confirmation completed successfully for session:', session_id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Payment confirmed and credits added successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
