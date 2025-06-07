
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
    console.log('=== CHECKOUT SESSION START ===');
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', requestBody);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid request body - must be valid JSON" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { email, user_id, plan, planName, credits, amount } = requestBody;
    
    // Enhanced validation with specific error messages
    if (!email) {
      console.error("Missing email field");
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!user_id) {
      console.error("Missing user_id field");
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!plan) {
      console.error("Missing plan field");
      return new Response(JSON.stringify({ error: "Plan is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!planName) {
      console.error("Missing planName field");
      return new Response(JSON.stringify({ error: "Plan name is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate and convert amount
    let numericAmount: number;
    if (amount === undefined || amount === null) {
      console.error("Missing amount field");
      return new Response(JSON.stringify({ error: "Amount is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (typeof amount === 'number') {
      numericAmount = amount;
    } else if (typeof amount === 'string') {
      numericAmount = parseFloat(amount);
    } else {
      console.error("Invalid amount type:", typeof amount, amount);
      return new Response(JSON.stringify({ error: "Amount must be a number" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error("Invalid amount value:", numericAmount);
      return new Response(JSON.stringify({ error: "Amount must be a positive number" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate and convert credits
    let numericCredits: number;
    if (credits === undefined || credits === null) {
      console.error("Missing credits field");
      return new Response(JSON.stringify({ error: "Credits is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (typeof credits === 'number') {
      numericCredits = credits;
    } else if (typeof credits === 'string') {
      numericCredits = parseInt(credits);
    } else {
      console.error("Invalid credits type:", typeof credits, credits);
      return new Response(JSON.stringify({ error: "Credits must be a number" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    if (isNaN(numericCredits) || numericCredits <= 0) {
      console.error("Invalid credits value:", numericCredits);
      return new Response(JSON.stringify({ error: "Credits must be a positive number" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Validation passed:', { 
      email, 
      user_id, 
      plan, 
      planName, 
      credits: numericCredits, 
      amount: numericAmount 
    });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Stripe secret key not configured");
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      typescript: true,
    });

    // Get the site URL from the request origin or use environment variable
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:3000";
    
    console.log('Creating Stripe checkout session with:', { 
      email, 
      user_id, 
      plan, 
      planName, 
      credits: numericCredits, 
      amount: numericAmount,
      siteUrl 
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: user_id,
      metadata: {
        user_id,
        plan,
        credits: numericCredits.toString(),
        plan_name: planName,
      },
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planName,
              description: `${numericCredits} credits`,
            },
            unit_amount: Math.round(numericAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/stripe-payment`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
    });

    console.log('Stripe checkout session created successfully:', session.id);

    // Initialize Supabase client with service role key for writing
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration missing");
    } else {
      const supabase = createClient(
        supabaseUrl,
        supabaseServiceKey,
        { 
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
        }
      );

      // Create payment record in database
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id,
          email,
          stripe_session_id: session.id,
          plan_name: planName,
          amount: Math.round(numericAmount * 100),
          credits_granted: numericCredits,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      } else {
        console.log('Payment record created successfully');
      }
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== CHECKOUT SESSION ERROR ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    let errorMessage = "An unexpected error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Please check your payment information and try again"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
