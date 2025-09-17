import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const { sessionId } = await req.json();
    
    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    if (sessionId) {
      // Handle case where we need to create a payment record from Stripe session
      console.log('Creating payment record for session:', sessionId);
      
      // Create the payment record for the damdam@gmail.com user
      const { data: payment, error: createError } = await supabase
        .from('payments')
        .insert({
          user_id: 'ebaef0e7-9a46-494b-a31c-84a86e10308b',
          email: 'damdam@gmail.com',
          stripe_session_id: sessionId,
          plan_name: 'CareGrowth Assistant Credits',
          amount: 4900, // $49 in cents
          credits_granted: 1000,
          status: 'completed'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating payment:', createError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to create payment record' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      console.log('Payment created and completed:', payment.id);

      // Check if credits were allocated
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('credits')
        .eq('user_id', payment.user_id)
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment created and processed successfully',
        payment_id: payment.id,
        user_credits: updatedProfile?.credits || 'unknown'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Original logic for existing stuck payments
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', '737e877d-7139-493a-8bc6-963b86fbb1d1')
      .eq('status', 'pending')
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found or already processed:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment not found or already processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('Processing stuck payment:', payment.id);

    // Update payment status to completed
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update payment status' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('Payment updated to completed. Credits should be allocated automatically via trigger.');

    // Check if credits were allocated
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', payment.user_id)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment processed successfully',
      payment_id: payment.id,
      user_credits: updatedProfile?.credits || 'unknown'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing stuck payment:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});