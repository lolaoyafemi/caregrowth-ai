
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
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ 
        error: "Authentication required - no authorization header" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Initialize Supabase client with anon key for auth verification
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Verify the user authentication
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(JSON.stringify({ 
        error: "Authentication failed - invalid token" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log('User authenticated:', { userId: user.id, email: user.email });

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
    
    // Verify the authenticated user matches the request
    if (user_id && user_id !== user.id) {
      console.error("User ID mismatch:", { authenticated: user.id, requested: user_id });
      return new Response(JSON.stringify({ 
        error: "User ID mismatch - authentication error" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (email && email !== user.email) {
      console.error("Email mismatch:", { authenticated: user.email, requested: email });
      return new Response(JSON.stringify({ 
        error: "Email mismatch - authentication error" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Use authenticated user's data
    const userEmail = user.email;
    const userId = user.id;

    // Enhanced validation with specific error messages
    if (!userEmail) {
      console.error("No email available for authenticated user");
      return new Response(JSON.stringify({ error: "User email not available" }), {
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
      email: userEmail, 
      user_id: userId, 
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
      email: userEmail, 
      user_id: userId, 
      plan, 
      planName, 
      credits: numericCredits, 
      amount: numericAmount,
      siteUrl 
    });

    // Check if customer exists in Stripe
    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
      console.log('Found existing Stripe customer:', stripeCustomer.id);
    } else {
      // Create new customer
      stripeCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: userId
        }
      });
      console.log('Created new Stripe customer:', stripeCustomer.id);
    }

    // Create recurring subscription session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan,
        credits: numericCredits.toString(),
        plan_name: planName,
      },
      mode: "subscription",
      line_items: [
        {
          price: "price_1S5YNqIQZuAET4ugPZXvVJqs", // Live Stripe price ID
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/stripe-payment`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          user_id: userId,
          plan,
          credits: numericCredits.toString(),
          plan_name: planName,
        }
      }
    });

    console.log('Stripe checkout session created successfully:', session.id);

    // Initialize Supabase client with service role key for writing
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseServiceKey) {
      console.error("Supabase service key missing");
    } else {
      const supabaseService = createClient(
        supabaseUrl,
        supabaseServiceKey,
        { 
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
        }
      );

      // Create payment record in database
      const { error: paymentError } = await supabaseService
        .from('payments')
        .insert({
          user_id: userId,
          email: userEmail,
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
