
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

    // ✅ 1. Extract session_id from query parameters (primary method for Stripe redirects)
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    
    // Fallback: try to get from request body if not in query params
    if (!sessionId) {
      try {
        const body = await req.json();
        sessionId = body.session_id;
        console.log('Session ID from request body (fallback):', sessionId);
      } catch (bodyError) {
        console.log('No session_id in body either, continuing with null');
      }
    } else {
      console.log('Session ID from query params:', sessionId);
    }

    if (!sessionId) {
      console.error('ERROR: No session_id provided');
      return new Response(JSON.stringify({ 
        success: false,
        error: "session_id is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ✅ 2. Check if Stripe secret key is available
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

    // Initialize Stripe with the secret key
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log('Attempting to retrieve Stripe session:', sessionId);

    // ✅ 2. Retrieve the session from Stripe
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
        status: 404,
      });
    }

    // ✅ 3. Verify payment status is 'paid'
    if (session.payment_status !== 'paid') {
      console.error('Payment not completed. Status:', session.payment_status);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Payment not completed. Status: ${session.payment_status}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }

    // ✅ 4. Extract and validate metadata
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

    // Check for duplicate payment processing
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

    // ✅ 5. Update user's credits and plan (FIXED: removed supabase.sql usage)
    console.log('Updating user credits and plan...');
    
    // First get current credits
    const { data: currentUser, error: getCurrentError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user_id)
      .single();

    if (getCurrentError) {
      console.error('Error getting current user:', getCurrentError);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to get current user: ${getCurrentError.message}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const currentCredits = currentUser?.credits || 0;
    const newCredits = currentCredits + creditsToAdd;
    
    console.log('Current credits:', currentCredits, 'Adding:', creditsToAdd, 'New total:', newCredits);

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        credits: newCredits,
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

    // ✅ 6. Update credit inventory (decrement total_purchased, increment sold_to_agencies)
    console.log('Updating credit inventory...');
    
    // Get current inventory
    const { data: currentInventory, error: getInventoryError } = await supabase
      .from('credit_inventory')
      .select('total_purchased, sold_to_agencies')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (getInventoryError) {
      console.error('Error getting current inventory:', getInventoryError);
    }

    const currentTotalPurchased = currentInventory?.total_purchased || 0;
    const currentSoldToAgencies = currentInventory?.sold_to_agencies || 0;
    
    const { data: inventoryUpdate, error: inventoryError } = await supabase
      .from('credit_inventory')
      .update({
        total_purchased: Math.max(0, currentTotalPurchased - creditsToAdd),
        sold_to_agencies: currentSoldToAgencies + creditsToAdd,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select('total_purchased, sold_to_agencies, available_balance')
      .single();

    let inventoryResult = null;
    if (inventoryError) {
      console.error('Error updating credit inventory:', inventoryError);
      // Don't fail the entire operation if inventory update fails
      console.log('Continuing despite inventory update error...');
    } else {
      console.log('Credit inventory updated successfully:', inventoryUpdate);
      inventoryResult = inventoryUpdate;
    }

    // Log the credit sale
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

    // ✅ 7. Return success response with 200 status
    return new Response(JSON.stringify({ 
      success: true,
      updatedCredits: updatedUser.credits,
      plan: updatedUser.plan,
      creditsAdded: creditsToAdd,
      inventoryUpdate: inventoryResult,
      salesLog: salesLogData || null,
      message: "Payment confirmed and user updated successfully"
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
