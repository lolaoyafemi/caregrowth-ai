
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

    // Handle checkout session completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Processing completed checkout session:', session.id, 'mode:', session.mode);

      // Implement idempotency check for duplicate prevention
      const idempotencyKey = `${event.type}_${session.id}`;
      const { data: existingEvent, error: eventError } = await supabase
        .from('security_events')
        .select('id')
        .eq('event_type', 'stripe_event_processed')
        .eq('event_data->idempotency_key', idempotencyKey)
        .single();

      if (existingEvent) {
        console.log('Event already processed, ignoring duplicate:', idempotencyKey);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Log event processing to prevent duplicates
      await supabase.from('security_events').insert({
        event_type: 'stripe_event_processed',
        event_data: { idempotency_key: idempotencyKey, stripe_event_id: event.id }
      });

      // Handle one-time payments
      if (session.mode === 'payment') {
        console.log('Processing one-time payment session:', session.id);

        // Basic customer info
        const customerEmail = session.customer_email || session.customer_details?.email;
        const customerName = session.customer_details?.name || null;

        // Try to resolve user_id by email
        let userId: string | null = null;
        try {
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existingUser = users.find((u: any) => u.email === customerEmail);
          if (existingUser) userId = existingUser.id;
        } catch (err) {
          console.log('Could not query users for payment session:', err);
        }

        // Credits derivation: 1 credit per $0.02 (amount_total is in cents)
        const amountCents = session.amount_total || 0;
        const creditsGranted = Math.floor((amountCents || 0) / 2);
        const planName = (session.metadata && (session.metadata.plan_name as string)) || 'One-time';

        // Check if payment already exists
        const { data: existingPayment, error: checkError } = await supabase
          .from('payments')
          .select('*')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing payment:', checkError);
          return new Response('Failed to check payment status', { status: 500 });
        }

        let paymentRecord: any = existingPayment;

        if (!paymentRecord) {
          // Insert new completed payment record (Payment Links won't precreate DB rows)
          const { data: inserted, error: insertError } = await supabase
            .from('payments')
            .insert({
              user_id: userId,
              email: customerEmail,
              amount: amountCents,
              credits_granted: creditsGranted,
              stripe_session_id: session.id,
              plan_name: planName,
              status: 'completed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting payment:', insertError);
            await supabase.from('security_events').insert({
              event_type: 'payment_processing_failure',
              event_data: {
                stripe_session_id: session.id,
                error: insertError.message,
                stage: 'webhook_payment_insert'
              }
            });
            return new Response('Failed to insert payment', { status: 500 });
          }

          paymentRecord = inserted;
          console.log('Inserted payment record:', paymentRecord.id);
        } else if (paymentRecord.status !== 'completed') {
          // Update existing to completed
          const { data: updated, error: updateError } = await supabase
            .from('payments')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', paymentRecord.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating payment:', updateError);
            await supabase.from('security_events').insert({
              event_type: 'payment_processing_failure',
              event_data: {
                stripe_session_id: session.id,
                error: updateError.message,
                stage: 'webhook_payment_update'
              }
            });
            return new Response('Failed to update payment', { status: 500 });
          }

          paymentRecord = updated;
          console.log('Payment updated to completed:', paymentRecord.id);
        } else {
          console.log('Payment already completed, continuing to credit allocation');
        }

        // Allocate credits immediately (independent of frontend redirect)
        try {
          // Create credit purchase expiring in 1 month
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('credit_purchases').insert({
            user_id: userId,
            email: customerEmail,
            credits_granted: creditsGranted,
            expires_at: expiresAt,
            source_type: 'purchase',
            source_id: paymentRecord.id
          });

          // Update user profile aggregate credits
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              email: customerEmail,
              credits: 0, // will be recalculated below
              updated_at: new Date().toISOString(),
              status: 'active'
            }, { onConflict: 'user_id', ignoreDuplicates: false });

          // Recompute active credits via SQL function
          const { data: updatedProfile, error: profileUpdateError } = await supabase
            .from('user_profiles')
            .update({
              credits: (await supabase.rpc('get_active_credits', { p_user_id: userId })).data,
              credits_expire_at: (await supabase
                .from('credit_purchases')
                .select('expires_at')
                .eq('user_id', userId)
                .eq('status', 'active')
                .gt('expires_at', new Date().toISOString())
                .order('expires_at', { ascending: true })
                .limit(1)
                .maybeSingle()).data?.expires_at || null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .maybeSingle();

          if (profileUpdateError) {
            console.error('Failed to update user profile credits:', profileUpdateError);
          } else {
            console.log('Credits allocated and profile updated for user:', userId);
          }
        } catch (allocError) {
          console.error('Credit allocation error:', allocError);
          await supabase.from('security_events').insert({
            event_type: 'credit_allocation_failure',
            event_data: {
              stripe_session_id: session.id,
              error: String(allocError)
            }
          });
        }

        // Send confirmation email for one-time purchase (best-effort)
        try {
          const emailResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-purchase-confirmation-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: customerEmail,
              name: customerName,
              credits: creditsGranted,
              planName: planName,
              amount: amountCents,
              isSubscription: false
            })
          });
          if (emailResult.ok) console.log('Purchase confirmation email sent');
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Handle subscription sessions
      if (session.mode !== 'subscription') {
        console.log('Unknown session mode:', session.mode);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get customer details
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer;
      
      if (!customerEmail || !customerId) {
        console.error('Missing customer information');
        return new Response("Missing customer information", { status: 400 });
      }

      console.log('Processing subscription for:', customerEmail);

      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      
      // Determine plan details from metadata or amount
      const metadata = session.metadata || {};
      const planName = metadata.plan_name || 'Custom';
      const creditsPerCycle = parseInt(metadata.credits) || Math.floor((price.unit_amount || 0) / 2);
      
      console.log('Subscription details:', { 
        subscriptionId: subscription.id, 
        planName, 
        creditsPerCycle, 
        priceId 
      });

      // Find user
      let userId = null;
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(user => user.email === customerEmail);
        if (existingUser) {
          userId = existingUser.id;
        }
      } catch (error) {
        console.log('Could not query users:', error);
      }

      // Create or update subscription record
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          email: customerEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          plan_name: planName,
          credits_per_cycle: creditsPerCycle,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'stripe_subscription_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (subError) {
        console.error('Error creating subscription:', subError);
        return new Response("Failed to create subscription", { status: 500 });
      }

      console.log('Subscription created:', subscriptionData.id);

      // Allocate initial credits
      const creditsAllocated = await supabase.rpc('allocate_subscription_credits', {
        p_subscription_id: subscriptionData.id,
        p_credits: creditsPerCycle
      });

      if (!creditsAllocated.data) {
        console.error('Failed to allocate credits');
      } else {
        console.log('Initial credits allocated successfully');
      }

      // Update user profile with subscription reference
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: customerEmail,
          subscription_id: subscriptionData.id,
          plan_name: planName,
          status: 'active',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      }

      // Send subscription confirmation email
      try {
        const emailResult = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-purchase-confirmation-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: customerEmail,
            name: session.customer_details?.name,
            credits: creditsPerCycle,
            planName: planName,
            amount: price.unit_amount,
            isSubscription: true
          })
        });
        
        if (emailResult.ok) {
          console.log('Subscription confirmation email sent');
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    // Handle subscription renewals
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      
      // Only handle subscription invoices (not one-time payments)
      if (!invoice.subscription) {
        console.log('Skipping non-subscription invoice');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log('Processing subscription renewal:', invoice.subscription);

      // Get subscription from database
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', invoice.subscription)
        .single();

      if (subError || !subscription) {
        console.error('Subscription not found:', subError);
        return new Response("Subscription not found", { status: 404 });
      }

      // Allocate renewal credits
      const creditsAllocated = await supabase.rpc('allocate_subscription_credits', {
        p_subscription_id: subscription.id,
        p_credits: subscription.credits_per_cycle
      });

      if (!creditsAllocated.data) {
        console.error('Failed to allocate renewal credits');
      } else {
        console.log('Renewal credits allocated:', subscription.credits_per_cycle);
      }

      // Update subscription period
      const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          status: stripeSubscription.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }

    // Handle subscription cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      console.log('Processing subscription cancellation:', subscription.id);

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

      console.log('Subscription marked as canceled');
    }

    // Handle subscription updates (pause, resume, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      
      console.log('Processing subscription update:', subscription.id);

      // Update subscription details
      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

      console.log('Subscription updated');
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
