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
    console.log('=== CREATE PAYMENT INTENT START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ 
        error: "Authentication required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Initialize Supabase client
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
        error: "Authentication failed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log('User authenticated:', { userId: user.id, email: user.email });

    // Parse the request body
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    const { plan, planName, credits, amount, couponCode } = JSON.parse(requestBody);
    console.log('Parsed request data:', { plan, planName, credits, amount, couponCode });
    
    // Validate inputs
    if (!plan || !planName || !credits || !amount) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const numericAmount = Number(amount);
    const numericCredits = Number(credits);

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
    });

    // Check if customer exists or create new one
    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
      console.log('Found existing Stripe customer:', stripeCustomer.id);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      console.log('Created new Stripe customer:', stripeCustomer.id);
    }

    let finalAmount = Math.round(numericAmount * 100); // Convert to cents
    let discountAmount = 0;
    let couponId = null;

    // Validate coupon code if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        console.log('Coupon validated:', { id: coupon.id, valid: coupon.valid });
        
        if (!coupon.valid) {
          return new Response(JSON.stringify({ 
            error: "This coupon is no longer valid" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Calculate discount
        if (coupon.percent_off) {
          discountAmount = Math.round((numericAmount * coupon.percent_off) / 100);
        } else if (coupon.amount_off) {
          discountAmount = coupon.amount_off / 100; // Stripe amounts are in cents
        }
        
        finalAmount = Math.max(50, finalAmount - Math.round(discountAmount * 100)); // Minimum $0.50
        couponId = coupon.id;
        console.log('Discount applied:', { originalAmount: numericAmount, discountAmount, finalAmount: finalAmount/100 });
        
      } catch (couponError) {
        console.error('Coupon validation failed:', couponError);
        return new Response(JSON.stringify({ 
          error: "Invalid coupon code" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Create payment intent for subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'usd',
      customer: stripeCustomer.id,
      setup_future_usage: 'off_session', // For recurring payments
      metadata: {
        user_id: user.id,
        plan,
        credits: numericCredits.toString(),
        plan_name: planName,
        type: 'subscription_setup',
        coupon_code: couponId || '',
        original_amount: numericAmount.toString(),
        discount_amount: discountAmount.toString()
      },
      description: `${planName} Subscription Setup - ${numericCredits} credits/month`
    });

    console.log('Payment intent created:', paymentIntent.id);

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      discountAmount: discountAmount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== CREATE PAYMENT INTENT ERROR ===");
    console.error("Error message:", error.message);
    
    return new Response(JSON.stringify({ 
      error: "Failed to create payment intent",
      details: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});