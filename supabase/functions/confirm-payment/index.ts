
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

    // Update user's credits and plan
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        credits: supabase.sql`COALESCE(credits, 0) + ${creditsToAdd}`,
        plan: plan.toLowerCase(),
        updated_at: new Date().toISOString()
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

    // Update credit inventory - deduct from total_purchased and add to sold_to_agencies
    console.log('Updating credit inventory:', { creditsToDeduct: creditsToAdd });
    
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('credit_inventory')
      .update({
        total_purchased: supabase.sql`COALESCE(total_purchased, 0) - ${creditsToAdd}`,
        sold_to_agencies: supabase.sql`COALESCE(sold_to_agencies, 0) + ${creditsToAdd}`,
        updated_at: new Date().toISOString()
      })
      .select('id, total_purchased, sold_to_agencies, available_balance');

    if (inventoryError) {
      console.error('Error updating credit inventory:', inventoryError);
      return new Response(JSON.stringify({ 
        error: "Failed to update credit inventory",
        details: inventoryError.message,
        userUpdate: "User credits were updated successfully, but inventory tracking failed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Successfully updated credit inventory:', inventoryData);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Payment confirmed and user updated successfully",
      user: updatedUser,
      creditsAdded: creditsToAdd,
      inventoryUpdate: {
        creditsDeducted: creditsToAdd,
        newInventoryState: inventoryData?.[0] || null
      }
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
