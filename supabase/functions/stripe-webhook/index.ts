
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper function to verify webhook signature manually
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const elements = signature.split(',');
    let timestamp: string | null = null;
    let v1: string | null = null;
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1 = value;
    }
    
    if (!timestamp || !v1) return false;
    
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature_bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expected = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return expected === v1;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      console.error('No Stripe signature found');
      return new Response("No signature", { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Verify webhook signature manually
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error('No webhook secret configured');
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const isValidSignature = await verifySignature(body, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return new Response("Invalid signature", { status: 400 });
    }

    // Parse the event
    let event;
    try {
      event = JSON.parse(body);
      console.log('Webhook verified:', event.type);
    } catch (err) {
      console.error('Failed to parse webhook body:', err);
      return new Response("Invalid JSON", { status: 400 });
    }

    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Processing completed checkout session:', session.id);

      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        console.error('No customer email found in session');
        return new Response("No customer email", { status: 400 });
      }

      console.log('Processing payment for email:', customerEmail);

      // Determine credits based on amount paid
      const amountTotal = session.amount_total || 0;
      let planName = 'Unknown';
      let creditsGranted = 0;

      // Map amount to credits (amounts are in cents)
      if (amountTotal === 100) { // $1
        planName = 'Starter';
        creditsGranted = 50;
      } else if (amountTotal === 200) { // $2
        planName = 'Professional';
        creditsGranted = 200;
      } else if (amountTotal === 300) { // $3
        planName = 'Enterprise';
        creditsGranted = 500;
      } else {
        // Default mapping based on amount
        creditsGranted = Math.floor(amountTotal / 2); // Rough conversion
        planName = 'Custom';
      }

      console.log('Allocating credits:', { customerEmail, planName, creditsGranted, amount: amountTotal });

      // Try to find existing user by checking the users table directly
      let userId = null;
      try {
        const { data: existingUser, error: userQueryError } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail)
          .maybeSingle();

        if (userQueryError) {
          console.log('Error querying users table:', userQueryError);
        } else if (existingUser) {
          userId = existingUser.id;
          console.log('Found existing user:', userId);
        } else {
          console.log('User not found in users table, will be created during signup:', customerEmail);
        }
      } catch (error) {
        console.log('Could not query users table, continuing without user_id:', error);
      }

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId || null, // null if user doesn't exist yet
          email: customerEmail,
          stripe_session_id: session.id,
          plan_name: planName,
          amount: amountTotal,
          credits_granted: creditsGranted,
          status: 'completed'
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        return new Response("Failed to create payment record", { status: 500 });
      }

      console.log('Payment record created successfully:', paymentData);

      // If user exists, allocate credits immediately
      if (userId) {
        const { error: creditError } = await supabase
          .from('users')
          .update({ 
            credits: supabase.sql`credits + ${creditsGranted}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (creditError) {
          console.error('Error updating user credits:', creditError);
        } else {
          console.log('Credits allocated successfully to existing user');
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
