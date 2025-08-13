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
    console.log('=== CONFIRM SUBSCRIPTION START ===');
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Authentication required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify the user authentication
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: "Authentication failed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse the request body
    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ 
        error: "Payment intent ID required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ 
        error: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get payment method to set up subscription
    const paymentMethod = paymentIntent.payment_method;
    const customer = paymentIntent.customer;

    // Get plan details from metadata
    const { plan, credits, plan_name } = paymentIntent.metadata;
    const creditsPerCycle = parseInt(credits);

    console.log('Setting up subscription for:', {
      customer,
      plan: plan_name,
      credits: creditsPerCycle
    });

    // Create a price for this subscription
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: paymentIntent.amount,
      recurring: {
        interval: 'month'
      },
      product_data: {
        name: `${plan_name} Subscription`
      }
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer as string,
      items: [{
        price: price.id
      }],
      default_payment_method: paymentMethod as string,
      metadata: {
        user_id: user.id,
        plan,
        credits,
        plan_name
      }
    });

    console.log('Subscription created:', subscription.id);

    // Create subscription record in database
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        email: user.email,
        stripe_customer_id: customer,
        stripe_subscription_id: subscription.id,
        stripe_price_id: price.id,
        plan_name,
        credits_per_cycle: creditsPerCycle,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription record:', subError);
      return new Response(JSON.stringify({ 
        error: "Failed to create subscription record" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Allocate initial credits
    const { data: creditsResult, error: creditsError } = await supabase.rpc('allocate_subscription_credits', {
      p_subscription_id: subscriptionData.id,
      p_credits: creditsPerCycle
    });
    
    if (creditsError) {
      console.error('Error allocating credits:', creditsError);
      return new Response(JSON.stringify({ 
        error: "Failed to allocate credits" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Update user profile
    await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        subscription_id: subscriptionData.id,
        plan_name,
        status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    console.log('Subscription setup completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      subscriptionId: subscription.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== CONFIRM SUBSCRIPTION ERROR ===");
    console.error("Error message:", error.message);
    
    return new Response(JSON.stringify({ 
      error: "Failed to confirm subscription",
      details: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});