
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15'
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing session_id' }),
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Stripe session:', session);

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not completed' }),
        { status: 402 }
      );
    }

    const metadata = session.metadata;
    if (!metadata || !metadata.user_id || !metadata.credits || !metadata.plan) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing metadata' }),
        { status: 400 }
      );
    }

    const user_id = metadata.user_id;
    const credits_to_add = parseInt(metadata.credits);
    const plan = metadata.plan;

    // Update user's credit balance
    const { error: updateError } = await supabase
      .from('users')
      .update({
        credits: supabase.rpc('add_credits', {
          user_id: user_id,
          credits_to_add: credits_to_add
        }),
        plan: plan.toLowerCase()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('User update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500 }
      );
    }

    // (Optional) Update credit inventory here if you manage central balance

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500 }
    );
  }
});
