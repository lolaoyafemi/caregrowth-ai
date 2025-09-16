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
    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get the stuck payment
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