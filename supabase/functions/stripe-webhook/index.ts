
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      console.error('No Stripe signature found');
      return new Response("No signature", { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error('No webhook secret configured');
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook verified:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response("Invalid signature", { status: 400 });
    }

    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Processing completed checkout session:', session.id);

      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        console.error('No customer email found in session');
        return new Response("No customer email", { status: 400 });
      }

      // Find user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) {
        console.error('Error fetching users:', userError);
        return new Response("Failed to fetch users", { status: 500 });
      }

      const user = userData.users.find(u => u.email === customerEmail);
      if (!user) {
        console.error('User not found for email:', customerEmail);
        return new Response("User not found", { status: 404 });
      }

      // Determine credits based on amount paid
      const amountTotal = session.amount_total || 0;
      let planName = 'Unknown';
      let creditsGranted = 0;

      // Map amount to credits (amounts are in cents)
      if (amountTotal === 4900) { // $49
        planName = 'Starter';
        creditsGranted = 50;
      } else if (amountTotal === 9900) { // $99
        planName = 'Professional';
        creditsGranted = 200;
      } else if (amountTotal === 24900) { // $249
        planName = 'Enterprise';
        creditsGranted = 500;
      } else {
        // Default mapping - could be customized
        creditsGranted = Math.floor(amountTotal / 100); // 1 credit per dollar
        planName = 'Custom';
      }

      console.log('Allocating credits:', { customerEmail, planName, creditsGranted, amount: amountTotal });

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          email: customerEmail,
          stripe_session_id: session.id,
          plan_name: planName,
          amount: amountTotal,
          credits_granted: creditsGranted,
          status: 'completed'
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        return new Response("Failed to create payment record", { status: 500 });
      }

      console.log('Payment record created successfully:', paymentData);

      // Verify credits were allocated (should happen automatically via trigger)
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching updated user:', fetchError);
      } else {
        console.log('User credits after payment:', updatedUser.credits);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
