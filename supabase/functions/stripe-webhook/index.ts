
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
      console.log('=== WEBHOOK RECEIVED ===');
      console.log('Event type:', event.type);
      console.log('Event ID:', event.id);
      console.log('Webhook verified successfully');
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
      const { data: existingEvent } = await supabase
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

      const customerEmail = session.customer_email || session.customer_details?.email;
      console.log('Customer email found:', customerEmail);
      if (!customerEmail) {
        console.error('CRITICAL ERROR: No customer email found in session');
        return new Response('Missing customer email', { status: 400 });
      }

      // Find user by email with enhanced logging
      let userId: string | null = null;
      console.log('=== USER LOOKUP START ===');
      console.log('Searching for user with email:', customerEmail);
      
      try {
        console.log('Attempting to find user in user_profiles table...');
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('email', customerEmail)
          .single();
        
        if (profileError) {
          console.log('User not found in user_profiles, error:', profileError.message);
        } else if (profile?.user_id) {
          userId = profile.user_id;
          console.log('User found in user_profiles:', userId);
        }
      } catch (profileErr) {
        console.error('Error querying user_profiles:', profileErr);
      }

      // Fallback to auth.users if not found in profiles
      if (!userId) {
        console.log('User not found in profiles, checking auth.users...');
        try {
          const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
          if (authError) {
            console.error('Error listing auth users:', authError);
          } else {
            const existingUser = users.find((u: any) => u.email === customerEmail);
            if (existingUser) {
              userId = existingUser.id;
              console.log('User found in auth.users:', userId);
            } else {
              console.log('User not found in auth.users either');
            }
          }
        } catch (error) {
          console.error('Failed to query auth.users:', error);
        }
      }
      
      if (!userId) {
        console.error('CRITICAL ERROR: Could not find user_id for email:', customerEmail);
        console.error('Credit allocation will fail - user must exist in database');
      } else {
        console.log('=== USER LOOKUP SUCCESS ===');
        console.log('Final user_id:', userId);
      }

      // Handle one-time payments
      if (session.mode === 'payment') {
        console.log('Processing one-time payment session (Payment Link):', session.id);

        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
          console.error('No customer email on session');
          return new Response('Missing customer email', { status: 400 });
        }

        // Retrieve full session to access line items and price metadata (if available)
        let fullSession: any = session;
        try {
          fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price'] });
        } catch (e) {
          console.warn('Could not expand session line items, proceeding with base session:', (e as Error)?.message);
        }

        const amountTotal = fullSession.amount_total ?? session.amount_total ?? 0; // in cents
        const priceMetaCredits = Number(fullSession?.line_items?.data?.[0]?.price?.metadata?.credits || 0);
        const metaCredits = Number(session?.metadata?.credits || 0);

        // Determine credits granted
        let creditsGranted = 0;
        if (!isNaN(priceMetaCredits) && priceMetaCredits > 0) creditsGranted = priceMetaCredits;
        else if (!isNaN(metaCredits) && metaCredits > 0) creditsGranted = metaCredits;
        else {
          const dollars = Math.round((amountTotal || 0)) / 100;
          if (Math.round(dollars) === 49) creditsGranted = 3000; // $49 subscription = 3000 credits
          else creditsGranted = Math.max(1, Math.floor(dollars * 20)); // reasonable fallback
        }

        // Find user by email
        let userId: string | null = null;
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('email', customerEmail)
            .single();
          if (profile?.user_id) userId = profile.user_id;
        } catch (_) {}

        if (!userId) {
          try {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingUser = users.find((u: any) => u.email === customerEmail);
            if (existingUser) userId = existingUser.id;
          } catch (error) {
            console.warn('Could not list users:', error);
          }
        }

        // Check for existing payment
        const { data: existingPayment, error: checkError } = await supabase
          .from('payments')
          .select('*')
          .eq('stripe_session_id', session.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing payment:', checkError);
          return new Response('Failed to check payment status', { status: 500 });
        }

        let paymentRecord = existingPayment;
        if (!paymentRecord) {
          const { data: inserted, error: insertError } = await supabase
            .from('payments')
            .insert({
              user_id: userId,
              email: customerEmail,
              amount: Math.round((amountTotal || 0) / 100),
              credits_granted: creditsGranted,
              stripe_session_id: session.id,
              plan_name: 'CareGrowth Assistant Credits',
              status: 'completed'
            })
            .select()
            .single();
          if (insertError) {
            console.error('Error inserting payment:', insertError);
            return new Response('Failed to record payment', { status: 500 });
          }
          paymentRecord = inserted;
        } else if (paymentRecord.status !== 'completed') {
          const { data: updated, error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'completed',
              credits_granted: paymentRecord.credits_granted || creditsGranted,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentRecord.id)
            .select()
            .single();
          if (updateError) {
            console.error('Error updating payment to completed:', updateError);
            return new Response('Failed to update payment', { status: 500 });
          }
          paymentRecord = updated;
        } else {
          console.log('Payment already completed, skipping duplicate allocation:', paymentRecord.id);
          return new Response(JSON.stringify({ received: true, already_processed: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        // Allocate credits (create credit_purchases and update profile balance)
        try {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await supabase.from('credit_purchases').insert({
            user_id: userId,
            email: customerEmail,
            credits_granted: creditsGranted,
            expires_at: expiresAt.toISOString(),
            source_type: 'purchase',
            source_id: paymentRecord.id
          });

          // Ensure profile exists and update balances
          await supabase.from('user_profiles').upsert({
            user_id: userId,
            email: customerEmail,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id', ignoreDuplicates: false });

          const { data: activeCredits } = await supabase.rpc('get_active_credits', { p_user_id: userId });
          await supabase
            .from('user_profiles')
            .update({
              credits: activeCredits ?? 0,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          console.log('Credits allocated for payment link purchase:', { creditsGranted, userId });
        } catch (allocError) {
          console.error('Failed to allocate credits:', allocError);
          await supabase.from('security_events').insert({
            event_type: 'payment_allocation_failure',
            event_data: { stripe_session_id: session.id, error: String(allocError) }
          });
        }

        // Send confirmation email (best-effort)
        try {
          const emailResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-purchase-confirmation-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: customerEmail,
              name: session.customer_details?.name,
              credits: creditsGranted,
              planName: 'CareGrowth Assistant Credits',
              amount: Math.round((amountTotal || 0) / 100),
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
      if (session.mode === 'subscription') {
        console.log('=== PROCESSING SUBSCRIPTION SESSION ===');
        console.log('Customer email:', customerEmail);
        console.log('User ID found:', userId);
        console.log('Session ID:', session.id);

        if (!session.customer || !session.subscription) {
          console.error('CRITICAL ERROR: Missing customer or subscription in session');
          console.error('Customer ID:', session.customer);
          console.error('Subscription ID:', session.subscription);
          return new Response("Invalid subscription session", { status: 400 });
        }

        console.log('Retrieving subscription details from Stripe...');
        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription, {
          expand: ['items.data.price']
        });
        const priceId = subscription.items.data[0].price.id;
        
        // Determine plan details from metadata or price
        const metadata = session.metadata || {};
        const planName = metadata.plan_name || subscription.items.data[0].price.nickname || 'Subscription Plan';
        let creditsPerCycle = parseInt(metadata.credits) || 0;
        
        // Fallback credit calculation if not in metadata
        if (!creditsPerCycle) {
          const unitAmount = subscription.items.data[0].price.unit_amount || 0;
          creditsPerCycle = Math.floor(unitAmount / 100) * 20; // $1 = 20 credits default
        }
        
        console.log('=== SUBSCRIPTION DETAILS ===');
        console.log('Subscription ID:', subscription.id);
        console.log('Plan name:', planName);
        console.log('Credits per cycle:', creditsPerCycle);
        console.log('Price ID:', priceId);
        console.log('Status:', subscription.status);

        if (!userId) {
          console.error('CRITICAL ERROR: Cannot create subscription without user_id');
          console.error('Email:', customerEmail);
          return new Response("User not found", { status: 400 });
        }

        console.log('=== CREATING SUBSCRIPTION RECORD ===');
        // Create or update subscription record
        const { data: subscriptionData, error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            email: customerEmail,
            stripe_customer_id: session.customer,
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
          console.error('ERROR: Failed to create subscription record');
          console.error('Error details:', subError);
          console.error('User ID:', userId);
          console.error('Email:', customerEmail);
          return new Response("Failed to create subscription", { status: 500 });
        }

        console.log('SUCCESS: Subscription record created/updated');
        console.log('Subscription DB ID:', subscriptionData.id);

        // Allocate initial credits
        if (creditsPerCycle > 0) {
          console.log('=== ALLOCATING INITIAL CREDITS ===');
          console.log('Credits to allocate:', creditsPerCycle);
          console.log('User ID:', userId);
          console.log('Email:', customerEmail);
          
          const expiresAt = new Date(subscription.current_period_end * 1000);
          console.log('Credits expire at:', expiresAt.toISOString());
          
          try {
            console.log('Inserting credit purchase record...');
            const { data: creditPurchase, error: creditError } = await supabase.from('credit_purchases').insert({
              user_id: userId,
              email: customerEmail,
              credits_granted: creditsPerCycle,
              expires_at: expiresAt.toISOString(),
              source_type: 'subscription',
              source_id: subscriptionData.id
            })
            .select()
            .single();

            if (creditError) {
              console.error('ERROR: Failed to insert credit purchase');
              console.error('Error details:', creditError);
              throw new Error(`Credit purchase insertion failed: ${creditError.message}`);
            }

            console.log('SUCCESS: Credit purchase record created');
            console.log('Credit purchase ID:', creditPurchase?.id);

            // Update user profile credits
            console.log('Calculating total active credits...');
            const { data: activeCredits, error: activeCreditsError } = await supabase.rpc('get_active_credits', { p_user_id: userId });
            
            if (activeCreditsError) {
              console.error('ERROR: Failed to calculate active credits');
              console.error('Error details:', activeCreditsError);
            } else {
              console.log('Total active credits calculated:', activeCredits);
            }

            console.log('Updating user profile...');
            const { data: profileUpdate, error: profileError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: userId,
                email: customerEmail,
                subscription_id: subscriptionData.id,
                plan_name: planName,
                credits: activeCredits || 0,
                status: 'active',
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id', ignoreDuplicates: false })
              .select();

            if (profileError) {
              console.error('ERROR: Failed to update user profile');
              console.error('Error details:', profileError);
              throw new Error(`Profile update failed: ${profileError.message}`);
            }

            console.log('SUCCESS: User profile updated');
            console.log('Profile update result:', profileUpdate);
            console.log('=== CREDIT ALLOCATION COMPLETE ===');
            console.log('Initial subscription credits allocated:', creditsPerCycle);

          } catch (allocError) {
            console.error('CRITICAL ERROR: Credit allocation failed');
            console.error('Error details:', allocError);
            console.error('Session ID:', session.id);
            console.error('User ID:', userId);
            console.error('Credits to allocate:', creditsPerCycle);
            
            // Log failure event
            await supabase.from('security_events').insert({
              event_type: 'subscription_credit_allocation_failure',
              event_data: { 
                stripe_session_id: session.id,
                stripe_subscription_id: subscription.id,
                user_id: userId,
                credits_per_cycle: creditsPerCycle,
                error: String(allocError)
              }
            });
          }
        } else {
          console.log('No credits to allocate (creditsPerCycle = 0)');
        }

        // Send subscription confirmation email
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-purchase-confirmation-email`, {
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
              amount: subscription.items.data[0].price.unit_amount,
              isSubscription: true
            })
          });
          console.log('Subscription confirmation email sent');
        } catch (emailError) {
          console.error('Failed to send subscription email:', emailError);
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log('Unknown session mode:', session.mode);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle subscription renewals
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      
      console.log('=== PROCESSING SUBSCRIPTION RENEWAL ===');
      console.log('Invoice ID:', invoice.id);
      console.log('Customer:', invoice.customer);
      console.log('Subscription ID:', invoice.subscription);
      
      // Only handle subscription invoices (not one-time payments)
      if (!invoice.subscription) {
        console.log('Skipping non-subscription invoice - no subscription ID');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log('Searching for subscription in database...');
      // Get subscription from database
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', invoice.subscription)
        .single();

      if (subError || !subscription) {
        console.error('ERROR: Subscription not found for renewal');
        console.error('Subscription ID:', invoice.subscription);
        console.error('Database error:', subError);
        return new Response("Subscription not found", { status: 404 });
      }

      console.log('SUCCESS: Found subscription in database');
      console.log('DB Subscription ID:', subscription.id);
      console.log('User ID:', subscription.user_id);
      console.log('Email:', subscription.email);
      console.log('Credits per cycle:', subscription.credits_per_cycle);

      // Allocate renewal credits
      if (subscription.credits_per_cycle > 0) {
        console.log('=== ALLOCATING RENEWAL CREDITS ===');
        console.log('Credits to allocate:', subscription.credits_per_cycle);
        
        try {
          // Get updated subscription details from Stripe
          console.log('Retrieving updated subscription from Stripe...');
          const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const expiresAt = new Date(stripeSubscription.current_period_end * 1000);
          console.log('Credits expire at:', expiresAt.toISOString());
          
          // Create credit purchase record for renewal
          console.log('Creating credit purchase record...');
          const { data: creditPurchase, error: creditError } = await supabase.from('credit_purchases').insert({
            user_id: subscription.user_id,
            email: subscription.email,
            credits_granted: subscription.credits_per_cycle,
            expires_at: expiresAt.toISOString(),
            source_type: 'subscription',
            source_id: subscription.id
          })
          .select()
          .single();

          if (creditError) {
            console.error('ERROR: Failed to create renewal credit purchase');
            console.error('Error details:', creditError);
            throw new Error(`Credit purchase creation failed: ${creditError.message}`);
          }

          console.log('SUCCESS: Credit purchase record created');
          console.log('Credit purchase ID:', creditPurchase?.id);

          // Update user profile with new active credits
          console.log('Calculating new total active credits...');
          const { data: activeCredits, error: activeCreditsError } = await supabase.rpc('get_active_credits', { 
            p_user_id: subscription.user_id 
          });
          
          if (activeCreditsError) {
            console.error('ERROR: Failed to calculate active credits');
            console.error('Error details:', activeCreditsError);
          } else {
            console.log('New total active credits:', activeCredits);
          }
          
          console.log('Updating user profile with new credits...');
          const { data: profileUpdate, error: profileError } = await supabase
            .from('user_profiles')
            .update({
              credits: activeCredits || 0,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', subscription.user_id)
            .select();

          if (profileError) {
            console.error('ERROR: Failed to update user profile');
            console.error('Error details:', profileError);
            throw new Error(`Profile update failed: ${profileError.message}`);
          }

          console.log('SUCCESS: User profile updated');
          console.log('Profile update result:', profileUpdate);
          console.log('=== RENEWAL CREDITS ALLOCATED ===');
          console.log('Renewal credits allocated:', subscription.credits_per_cycle);

        } catch (renewalError) {
          console.error('CRITICAL ERROR: Renewal credit allocation failed');
          console.error('Error details:', renewalError);
          console.error('Invoice ID:', invoice.id);
          console.error('Subscription ID:', subscription.id);
          console.error('User ID:', subscription.user_id);
          
          // Log failure event
          await supabase.from('security_events').insert({
            event_type: 'renewal_credit_allocation_failure',
            event_data: { 
              invoice_id: invoice.id,
              stripe_subscription_id: invoice.subscription,
              db_subscription_id: subscription.id,
              user_id: subscription.user_id,
              credits_per_cycle: subscription.credits_per_cycle,
              error: String(renewalError)
            }
          });
        }
      } else {
        console.log('No renewal credits to allocate (credits_per_cycle = 0)');
      }

      console.log('=== UPDATING SUBSCRIPTION PERIOD ===');
      try {
        // Update subscription period and status
        const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
        console.log('Stripe subscription status:', stripeSubscription.status);
        console.log('New period start:', new Date(stripeSubscription.current_period_start * 1000).toISOString());
        console.log('New period end:', new Date(stripeSubscription.current_period_end * 1000).toISOString());
        
        const { data: subUpdate, error: subUpdateError } = await supabase
          .from('subscriptions')
          .update({
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            status: stripeSubscription.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
          .select();

        if (subUpdateError) {
          console.error('ERROR: Failed to update subscription period');
          console.error('Error details:', subUpdateError);
        } else {
          console.log('SUCCESS: Subscription period updated');
          console.log('Update result:', subUpdate);
        }
      } catch (updateError) {
        console.error('ERROR: Failed to update subscription period');
        console.error('Error details:', updateError);
      }

      console.log('=== SUBSCRIPTION RENEWAL COMPLETE ===');
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle subscription cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      console.log('=== PROCESSING SUBSCRIPTION CANCELLATION ===');
      console.log('Subscription ID:', subscription.id);
      console.log('Customer:', subscription.customer);
      console.log('Status:', subscription.status);

      try {
        // Update subscription status
        console.log('Marking subscription as canceled in database...');
        const { data: cancelUpdate, error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
          .select();

        if (cancelError) {
          console.error('ERROR: Failed to mark subscription as canceled');
          console.error('Error details:', cancelError);
        } else {
          console.log('SUCCESS: Subscription marked as canceled');
          console.log('Update result:', cancelUpdate);
        }
      } catch (error) {
        console.error('ERROR: Exception while canceling subscription');
        console.error('Error details:', error);
      }

      console.log('=== SUBSCRIPTION CANCELLATION COMPLETE ===');
    }

    // Handle subscription updates (pause, resume, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      
      console.log('=== PROCESSING SUBSCRIPTION UPDATE ===');
      console.log('Subscription ID:', subscription.id);
      console.log('Customer:', subscription.customer);
      console.log('Status:', subscription.status);
      console.log('Cancel at period end:', subscription.cancel_at_period_end);
      console.log('Current period start:', new Date(subscription.current_period_start * 1000).toISOString());
      console.log('Current period end:', new Date(subscription.current_period_end * 1000).toISOString());

      try {
        // Update subscription details
        console.log('Updating subscription details in database...');
        const { data: updateResult, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
          .select();

        if (updateError) {
          console.error('ERROR: Failed to update subscription');
          console.error('Error details:', updateError);
        } else {
          console.log('SUCCESS: Subscription updated');
          console.log('Update result:', updateResult);
        }
      } catch (error) {
        console.error('ERROR: Exception while updating subscription');
        console.error('Error details:', error);
      }

      console.log('=== SUBSCRIPTION UPDATE COMPLETE ===');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
