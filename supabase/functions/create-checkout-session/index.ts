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
    // Parse the request body
    const { email, user_id, plan, planName, credits, amount } = await req.json();
    
    // Validate required fields
    if (!email || !user_id || !plan || !planName || !credits || !amount) {
      console.error("Missing required fields:", { email, user_id, plan, planName, credits, amount });
      return new Response(JSON.stringify({ 
        error: "Missing required fields: email, user_id, plan, planName, credits, amount" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate amount is a positive number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error("Invalid amount:", amount);
      return new Response(JSON.stringify({ 
        error: "Amount must be a positive number" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate credits is a positive number
    const numericCredits = parseInt(credits);
    if (isNaN(numericCredits) || numericCredits <= 0) {
      console.error("Invalid credits:", credits);
      return new Response(JSON.stringify({ 
        error: "Credits must be a positive number" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Stripe secret key not configured");
      return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      typescript: true,
    });

    // Get the site URL from the request origin or use environment variable
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:3000";
    
    console.log('Creating Stripe checkout session for:', { 
      email, 
      user_id, 
      plan, 
      planName, 
      credits: numericCredits, 
      amount: numericAmount,
      siteUrl 
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: user_id, // Add this for better tracking
      metadata: {
        user_id,
        plan,
        credits: numericCredits.toString(),
        plan_name: planName,
      },
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planName,
              description: `${numericCredits} credits`, // Add description
            },
            unit_amount: Math.round(numericAmount * 100), // Ensure it's an integer
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/stripe-payment`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes expiry
      payment_method_types: ['card'], // Explicitly specify payment methods
      billing_address_collection: 'auto',
    });

    console.log('Stripe checkout session created:', session.id);

    // Initialize Supabase client with service role key for writing
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration missing");
      // Continue without database insert - webhook will handle it
    } else {
      const supabase = createClient(
        supabaseUrl,
        supabaseServiceKey,
        { 
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
        }
      );

      // Create payment record in database
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id,
          email,
          stripe_session_id: session.id,
          plan_name: planName,
          amount: Math.round(numericAmount * 100), // Store in cents as integer
          credits_granted: numericCredits,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Don't fail the request if we can't create the payment record
        // The webhook will handle payment completion
      } else {
        console.log('Payment record created successfully');
      }
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Checkout session creation error:", error);
    
    // Log more details about Stripe errors
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: error instanceof Error ? error.name : "Unknown error type"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});




// import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// import Stripe from "https://esm.sh/stripe@14.21.0";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
// };

// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === "OPTIONS") {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     // Parse the request body
//     const { email, user_id, plan, planName, credits, amount } = await req.json();

//     // Validate required fields
//     if (!email || !user_id || !plan || !planName || !credits || !amount) {
//       return new Response(JSON.stringify({ 
//         error: "Missing required fields: email, user_id, plan, planName, credits, amount" 
//       }), {
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//         status: 400,
//       });
//     }

//     // Initialize Stripe
//     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
//     if (!stripeKey) {
//       return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//         status: 500,
//       });
//     }

//     const stripe = new Stripe(stripeKey, {
//       apiVersion: "2023-10-16",
//     });

//     // Get the site URL from the request origin
//     const siteUrl = req.headers.get("origin") || "http://localhost:3000";

//     console.log('Creating Stripe checkout session for:', { email, user_id, plan, planName, credits, amount });

//     // Create Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//       customer_email: email,
//       metadata: {
//         user_id,
//         plan,
//         credits: credits.toString(),
//       },
//       mode: "payment",
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: {
//               name: planName,
//             },
//             unit_amount: amount * 100, // Convert to cents
//           },
//           quantity: 1,
//         },
//       ],
//       success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${siteUrl}/stripe-payment`,
//     });

//     console.log('Stripe checkout session created:', session.id);

//     // Initialize Supabase client with service role key for writing
//     const supabase = createClient(
//       Deno.env.get("SUPABASE_URL") ?? "",
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
//       { auth: { persistSession: false } }
//     );

//     // Create payment record in database
//     const { error: paymentError } = await supabase
//       .from('payments')
//       .insert({
//         user_id,
//         email,
//         stripe_session_id: session.id,
//         plan_name: planName,
//         amount: amount * 100, // Store in cents
//         credits_granted: credits,
//         status: 'pending'
//       });

//     if (paymentError) {
//       console.error('Error creating payment record:', paymentError);
//       // Don't fail the request if we can't create the payment record
//       // The webhook will handle payment completion
//     }

//     return new Response(JSON.stringify({ url: session.url }), {
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//       status: 200,
//     });

//   } catch (error) {
//     console.error("Checkout session creation error:", error);
//     return new Response(JSON.stringify({ 
//       error: error instanceof Error ? error.message : "Unknown error occurred" 
//     }), {
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//       status: 500,
//     });
//   }
// });
