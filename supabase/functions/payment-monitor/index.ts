import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find payments that are stuck (created more than 10 minutes ago but still pending)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const { data: stuckPayments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error checking stuck payments:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Found ${stuckPayments?.length || 0} potentially stuck payments`);

    // Log stuck payments for monitoring
    if (stuckPayments && stuckPayments.length > 0) {
      for (const payment of stuckPayments) {
        console.log(`Stuck payment detected: ${payment.id}, session: ${payment.stripe_session_id}, created: ${payment.created_at}`);
        
        // Log security event for monitoring
        await supabase.from('security_events').insert({
          event_type: 'stuck_payment_detected',
          event_data: {
            payment_id: payment.id,
            stripe_session_id: payment.stripe_session_id,
            email: payment.email,
            amount: payment.amount,
            created_at: payment.created_at,
            time_stuck_minutes: Math.floor((Date.now() - new Date(payment.created_at).getTime()) / 60000)
          }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      stuck_payments_count: stuckPayments?.length || 0,
      stuck_payments: stuckPayments || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment monitoring error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});