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
    console.log('=== CUSTOMER PORTAL START ===');
    
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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

    // Resolve Stripe customer ID: prefer DB subscription record, fallback to email lookup
    let customerId: string | null = null;

    // Try to get from our subscriptions table
    const { data: subRecord, error: subErr } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      console.warn('Subscription lookup error:', subErr);
    }

    if (subRecord?.stripe_customer_id) {
      customerId = subRecord.stripe_customer_id;
      console.log('Customer ID from DB:', customerId);
    } else {
      console.log('No DB customer id; falling back to email search in Stripe');
      const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('Customer ID from Stripe email lookup:', customerId);
      }
    }

    if (!customerId) {
      console.error('No Stripe customer found for user:', user.email);
      const origin = req.headers.get('origin') || Deno.env.get('PROJECT_URL') || 'https://www.spicymessaging.com';
      return new Response(JSON.stringify({
        error: 'No subscription found for this user',
        message: 'We could not locate your billing profile. Please contact support or re-initiate checkout.',
        fallback_url: `${origin}/stripe-payment`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customer = { id: customerId } as const;
    console.log('Resolved Stripe customer:', customer.id);

    // Create billing portal session
    const origin = req.headers.get("origin") || "https://www.spicymessaging.com";
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${origin}/settings`,
      });

      console.log('Customer portal session created:', portalSession.id);

      return new Response(JSON.stringify({ 
        url: portalSession.url
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError) {
      console.error('Stripe billing portal error:', stripeError);
      const raw: any = stripeError as any;
      const msg: string = raw?.message || raw?.raw?.message || 'Unknown error';

      // Friendly fallbacks for common cases
      if (
        msg.includes('not activated') ||
        msg.includes('No configuration provided') ||
        msg.includes('default configuration') ||
        raw?.code === 'billing_portal_feature_disabled'
      ) {
        return new Response(JSON.stringify({ 
          error: 'Billing portal not configured',
          message: 'Please contact support to manage your subscription',
          fallback_url: `${origin}/stripe-payment`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      if (msg.includes('No such customer') || raw?.code === 'resource_missing') {
        return new Response(JSON.stringify({ 
          error: 'Customer not found',
          message: 'We could not locate your billing profile in Stripe. Please contact support or re-initiate checkout.',
          fallback_url: `${origin}/stripe-payment`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      throw stripeError;
    }

  } catch (error) {
    console.error("=== CUSTOMER PORTAL ERROR ===");
    console.error("Error message:", (error as Error).message);
    
    return new Response(JSON.stringify({ 
      error: "Failed to create customer portal session",
      details: (error as Error).message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});