import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { scenarioId, messages } = await req.json();

    // Get scenario details
    const { data: scenario, error: docError } = await supabase
      .from("training_scenarios")
      .select("*")
      .eq("id", scenarioId)
      .single();

    if (docError || !scenario) {
      throw new Error("Scenario not found");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = scenario.ai_system_prompt || `You are simulating a caller contacting a home care agency. Your persona is: ${scenario.caller_persona || 'Family member'}. The situation: ${scenario.care_situation || scenario.description}. Your primary concern: ${scenario.primary_concern || 'Getting help'}. Your emotional tone is: ${scenario.emotional_tone || 'Neutral'}. The agent will speak with you. Keep your responses short (1-3 sentences) and realistic. Only answer what is asked or express your concern. Start the conversation by saying what's on your mind.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const reply = aiResult.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({
        success: true,
        reply,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});