
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { email, user_id, plan, planName, credits, amount } = await req.json();

    // Validate required fields
    if (!email || !user_id || !plan || !planName || !credits || !amount) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: email, user_id, plan, planName, credits, amount" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get the site URL from the request origin
    const siteUrl = req.headers.get("origin") || "http://localhost:3000";

    console.log('Creating Stripe checkout session for:', { email, user_id, plan, planName, credits, amount });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      metadata: {
        user_id,
        plan,
        credits: credits.toString(),
      },
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planName,
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/stripe-payment`,
    });

    console.log('Stripe checkout session created:', session.id);

    // Initialize Supabase client with service role key for writing
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create payment record in database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        email,
        stripe_session_id: session.id,
        plan_name: planName,
        amount: amount * 100, // Store in cents
        credits_granted: credits,
        status: 'pending'
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Don't fail the request if we can't create the payment record
      // The webhook will handle payment completion
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Checkout session creation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
