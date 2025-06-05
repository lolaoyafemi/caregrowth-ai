
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
    // Get session_id from query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return new Response(JSON.stringify({ 
        error: "session_id parameter is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Confirming payment for session:', sessionId);

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

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return new Response(JSON.stringify({ 
        error: "Session not found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    console.log('Retrieved session:', { 
      id: session.id, 
      status: session.payment_status,
      metadata: session.metadata 
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ 
        error: "Payment not completed",
        status: session.payment_status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract metadata
    const { user_id, plan, credits } = session.metadata || {};
    
    if (!user_id || !plan || !credits) {
      return new Response(JSON.stringify({ 
        error: "Missing required metadata in session" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const creditsToAdd = parseInt(credits, 10);
    if (isNaN(creditsToAdd)) {
      return new Response(JSON.stringify({ 
        error: "Invalid credits value in metadata" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Processing payment confirmation:', { 
      user_id, 
      plan, 
      creditsToAdd 
    });

    // Initialize Supabase client with service role key for writing
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if this payment has already been processed
    const { data: existingPayment } = await supabase
      .from('credit_sales_log')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();

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
        error: "Failed to update user credits and plan",
        details: updateError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Successfully updated user:', updatedUser);

    // Insert record into credit_sales_log
    console.log('Logging credit sale:', { 
      user_id, 
      credits: creditsToAdd, 
      amount: session.amount_total,
      plan 
    });

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
      return new Response(JSON.stringify({ 
        error: "Failed to log credit sale",
        details: salesLogError.message,
        userUpdate: "User credits were updated successfully, but sales logging failed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Successfully logged credit sale:', salesLogData);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Payment confirmed and user updated successfully",
      user: updatedUser,
      creditsAdded: creditsToAdd,
      salesLog: salesLogData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment confirmation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
