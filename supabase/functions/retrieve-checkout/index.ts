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
    console.log('=== RETRIEVE CHECKOUT START ===');
    
    // Parse the request body
    const { session_id } = await req.json();
    
    if (!session_id) {
      console.error("Missing session_id");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "session_id is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Retrieving checkout session:', session_id);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Stripe secret key not configured");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Payment system not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      typescript: true,
    });

    // Retrieve the checkout session with expanded data
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items.data.price', 'customer']
    });

    console.log('Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name
    });

    // Confirm that the session is paid or complete
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      console.warn('Session not completed or paid:', { 
        payment_status: session.payment_status, 
        status: session.status 
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract customer details
    const customer_email = session.customer_details?.email || session.customer?.email;
    const customer_name = session.customer_details?.name;
    const user_id = session.client_reference_id || session.metadata?.user_id;
    
    console.log('Customer details:', { customer_email, customer_name, user_id });

    if (!customer_email) {
      console.error("No customer email found in session");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Customer email not found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract credits from metadata or calculate from line items
    let credits = 0;
    if (session.metadata?.credits) {
      credits = parseInt(session.metadata.credits);
    } else if (session.line_items?.data?.[0]) {
      // Default credit calculation (could be enhanced based on price)
      credits = 1000; // Default subscription credits
    }

    console.log('Credits to allocate:', credits);

    // Initialize Supabase with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find or create user in user_profiles
    let user_profile;
    
    if (user_id) {
      // Try to find by user_id first
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (existingProfile) {
        user_profile = existingProfile;
        console.log('Found existing profile by user_id:', user_id);
      } else {
        console.log('Profile not found by user_id, searching by email...');
      }
    }

    if (!user_profile) {
      // Try to find by email
      const { data: emailProfile, error: emailError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', customer_email)
        .maybeSingle();

      if (emailProfile) {
        user_profile = emailProfile;
        console.log('Found existing profile by email:', customer_email);
      } else {
        console.log('No existing profile found, will create new one');
      }
    }

    // Prepare upsert data
    const profileData: any = {
      email: customer_email,
    };

    // Only update full_name if we have a customer name and it's not already set
    if (customer_name && (!user_profile?.full_name || user_profile.full_name === customer_email.split('@')[0])) {
      profileData.full_name = customer_name;
    }

    // If no existing profile, add required fields for new profile
    if (!user_profile) {
      profileData.user_id = user_id || crypto.randomUUID();
      profileData.full_name = customer_name || customer_email.split('@')[0];
      profileData.credits = 0; // Will be updated after credit allocation
      profileData.status = 'active';
      profileData.role = 'user';
    }

    // Upsert user profile
    const { data: upsertedProfile, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: user_profile ? 'user_id' : undefined,
        ignoreDuplicates: false 
      })
      .select('*')
      .single();

    if (upsertError) {
      console.error('Error upserting user profile:', upsertError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to create/update user profile" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('User profile upserted successfully:', upsertedProfile.user_id);
    const final_user_id = upsertedProfile.user_id;

    // Insert or update payments table
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .upsert({
        user_id: final_user_id,
        email: customer_email,
        stripe_session_id: session.id,
        plan_name: session.metadata?.plan_name || 'CareGrowth Assistant Credits',
        amount: session.amount_total || 0,
        credits_granted: credits,
        status: 'completed',
      }, { onConflict: 'stripe_session_id' })
      .select('*')
      .single();

    if (paymentError) {
      console.error('Error upserting payment:', paymentError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to record payment" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Payment record upserted successfully');

    // Insert into credit_purchases with expiry date (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    const { data: creditPurchase, error: creditError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: final_user_id,
        email: customer_email,
        credits_granted: credits,
        expires_at: expiryDate.toISOString(),
        source_type: session.mode === 'subscription' ? 'subscription' : 'purchase',
        source_id: session.subscription || session.id,
      })
      .select('*')
      .single();

    if (creditError) {
      console.error('Error inserting credit purchase:', creditError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to allocate credits" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Credit purchase inserted successfully');

    // Recalculate active credits using the RPC function
    const { data: activeCredits, error: creditsError } = await supabase
      .rpc('get_active_credits', { p_user_id: final_user_id });

    if (creditsError) {
      console.error('Error calculating active credits:', creditsError);
    } else {
      console.log('Active credits calculated:', activeCredits);

      // Update user_profiles with current active credits
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          credits: activeCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', final_user_id);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
      } else {
        console.log('User credits updated successfully');
      }
    }

    console.log('=== RETRIEVE CHECKOUT COMPLETED ===');

    return new Response(JSON.stringify({ 
      success: true,
      message: "Credits allocated successfully",
      credits_allocated: credits,
      user_id: final_user_id,
      payment_id: paymentData.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== RETRIEVE CHECKOUT ERROR ===");
    console.error("Error:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: "An unexpected error occurred while processing the checkout session"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});