
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { email, planName, amount, creditsGranted } = await req.json();
    
    console.log('Processing payment for:', { email, planName, amount, creditsGranted });
    
    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error fetching users:', userError);
      throw new Error('Failed to fetch users');
    }

    const user = userData.users.find((u: any) => u.email === email);
    if (!user) {
      console.error('User not found for email:', email);
      throw new Error('User not found');
    }

    console.log('Found user:', user.id);

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        email: email,
        stripe_session_id: `manual_${Date.now()}`, // For manual processing
        plan_name: planName,
        amount: amount * 100, // Convert to cents
        credits_granted: creditsGranted,
        status: 'completed'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    console.log('Payment record created:', paymentData);

    // The trigger will automatically allocate credits
    // Let's verify the user's credits were updated
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated user:', fetchError);
    } else {
      console.log('User credits after payment:', updatedUser.credits);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment processed successfully',
      creditsGranted 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
