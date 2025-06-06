
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

    // Calculate total credits from all completed payments for this email
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('credits_granted')
      .eq('email', customerEmail)
      .eq('status', 'completed');

    if (paymentsError) {
      console.error('Error querying payments:', paymentsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error querying payments' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate total credits including the current payment
    const existingCredits = allPayments?.reduce((sum, payment) => sum + payment.credits_granted, 0) || 0;
    const totalCredits = existingCredits + paymentRecord.credits_granted;

    console.log('Calculated total credits:', totalCredits, '(existing:', existingCredits, '+ new:', paymentRecord.credits_granted, ')');

    // Find or create user profile by email
    let { data: existingProfile, error: profileQueryError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', customerEmail)
      .maybeSingle();

    if (profileQueryError) {
      console.error('Error querying user profile:', profileQueryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error querying user profile' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let profileId = existingProfile?.id;

    if (!existingProfile) {
      // Create new user profile if doesn't exist
      const { data: newProfile, error: createProfileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: paymentRecord.user_id, // This might be null if user doesn't exist in auth
          email: customerEmail,
          credits: totalCredits,
          plan_name: paymentRecord.plan_name,
          business_name: session.customer_details?.name || null
        })
        .select()
        .single();

      if (createProfileError || !newProfile) {
        console.error('Error creating user profile:', createProfileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Error creating user profile' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      profileId = newProfile.id;
      console.log('Created new user profile:', profileId, 'with total credits:', totalCredits);
    } else {
      // Update existing user profile
      const { error: updateProfileError } = await supabase
        .from('user_profiles')
        .update({
          credits: totalCredits,
          plan_name: paymentRecord.plan_name,
          user_id: paymentRecord.user_id || existingProfile.user_id // Keep existing user_id if new one is null
        })
        .eq('id', existingProfile.id);

      if (updateProfileError) {
        console.error('Error updating user profile:', updateProfileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Error updating user profile' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('Updated existing user profile:', profileId, 'with total credits:', totalCredits);
    }

    // Update payment record status to completed
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
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
      message: 'Payment confirmed and credits added successfully',
      total_credits: totalCredits
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
