
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    const { planName, amount, email, credits, couponCode } = await req.json();
    
    console.log('Creating checkout session for:', { planName, amount, email, credits, couponCode });
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create subscription checkout session
    const sessionData: any = {
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `${planName}`,
              description: `${credits} credits per month`
            },
            unit_amount: amount * 100, // Convert to cents
            recurring: {
              interval: "month"
            }
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin") || Deno.env.get("PROJECT_URL")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || Deno.env.get("PROJECT_URL")}/payment?payment=cancelled`,
      metadata: {
        plan_name: planName,
        email: email,
        credits: credits.toString()
      }
    };

    // Add coupon if provided
    if (couponCode) {
      try {
        // Validate coupon exists
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          sessionData.discounts = [{
            coupon: couponCode
          }];
          console.log('Applied coupon:', couponCode);
        }
      } catch (couponError) {
        console.warn('Coupon validation failed, proceeding without discount:', couponError.message);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log('Payment session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
