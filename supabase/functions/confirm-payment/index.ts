
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
    console.log('=== CONFIRM PAYMENT FUNCTION STARTED ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

    // Get session_id from query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    console.log('Session ID from query params:', sessionId);

    if (!sessionId) {
      console.error('ERROR: No session_id provided in query parameters');
      return new Response(JSON.stringify({ 
        success: false,
        error: "session_id parameter is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if Stripe secret key is available
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log('Stripe key available:', !!stripeKey);
    
    if (!stripeKey) {
      console.error('ERROR: STRIPE_SECRET_KEY not found in environment');
      return new Response(JSON.stringify({ 
        success: false,
        error: "Stripe secret key not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log('Attempting to retrieve Stripe session:', sessionId);

    // Retrieve the session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('Session retrieved successfully:', {
        id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        metadata: session.metadata
      });
    } catch (stripeError) {
      console.error('ERROR retrieving Stripe session:', stripeError);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to retrieve session from Stripe: ${stripeError.message}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.error('Payment not completed. Status:', session.payment_status);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Payment not completed. Status: ${session.payment_status}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract and validate metadata
    const metadata = session.metadata || {};
    console.log('Session metadata:', metadata);
    
    const { user_id, plan, credits } = metadata;
    
    if (!user_id) {
      console.error('ERROR: Missing user_id in session metadata');
      return new Response(JSON.stringify({ 
        success: false,
        error: "Missing user_id in session metadata. Please contact support." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!plan) {
      console.error('ERROR: Missing plan in session metadata');
      return new Response(JSON.stringify({ 
        success: false,
        error: "Missing plan information in session metadata. Please contact support." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!credits) {
      console.error('ERROR: Missing credits in session metadata');
      return new Response(JSON.stringify({ 
        success: false,
        error: "Missing credits information in session metadata. Please contact support." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const creditsToAdd = parseInt(credits, 10);
    if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
      console.error('ERROR: Invalid credits value:', credits);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Invalid credits value: ${credits}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Processing payment confirmation for:', { 
      user_id, 
      plan, 
      creditsToAdd,
      sessionId 
    });

    // Initialize Supabase client with service role key for writing
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log('Supabase URL available:', !!supabaseUrl);
    console.log('Supabase service key available:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ERROR: Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        success: false,
        error: "Database configuration error" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Check if this payment has already been processed
    console.log('Checking for existing payment record...');
    const { data: existingPayment, error: existingError } = await supabase
      .from('credit_sales_log')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing payment:', existingError);
    }

    if (existingPayment) {
      console.log('Payment already processed for session:', sessionId);
      return new Response(JSON.stringify({ 
        success: true,
        message: "Payment already processed",
        alreadyProcessed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update user's credits and plan
    console.log('Updating user credits...');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        credits: supabase.sql`COALESCE(credits, 0) + ${creditsToAdd}`,
        plan: plan.toLowerCase()
      })
      .eq('id', user_id)
      .select('id, credits, plan')
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to update user credits: ${updateError.message}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('User updated successfully:', updatedUser);

    // Insert record into credit_sales_log
    console.log('Logging credit sale...');
    const { data: salesLogData, error: salesLogError } = await supabase
      .from('credit_sales_log')
      .insert({
        user_id: user_id,
        email: session.customer_details?.email || '',
        credits_purchased: creditsToAdd,
        amount_paid: (session.amount_total || 0) / 100, // Convert from cents to dollars
        plan_name: plan,
        stripe_session_id: sessionId
      })
      .select('id, email, credits_purchased, amount_paid, plan_name')
      .single();

    if (salesLogError) {
      console.error('Error logging credit sale:', salesLogError);
      // Don't fail the entire operation if logging fails
      console.log('Continuing despite logging error...');
    } else {
      console.log('Credit sale logged successfully:', salesLogData);
    }

    console.log('=== PAYMENT CONFIRMATION COMPLETED SUCCESSFULLY ===');

    return new Response(JSON.stringify({ 
      success: true,
      message: "Payment confirmed and user updated successfully",
      user: updatedUser,
      creditsAdded: creditsToAdd,
      salesLog: salesLogData || null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN CONFIRM PAYMENT ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error occurred"}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
