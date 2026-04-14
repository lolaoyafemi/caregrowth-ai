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
    const { triggerId, userId } = await req.json();

    if (!triggerId && !userId) {
      // Process all pending triggers
      const { data: pendingTriggers, error } = await supabase
        .from("scenario_triggers")
        .select("*")
        .eq("status", "pending")
        .limit(10);

      if (error) throw error;
      if (!pendingTriggers || pendingTriggers.length === 0) {
        return new Response(JSON.stringify({ success: true, processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;
      for (const trigger of pendingTriggers) {
        try {
          await generateScenarioFromTrigger(supabase, trigger);
          processed++;
        } catch (e) {
          console.error(`Failed to process trigger ${trigger.id}:`, e);
          await supabase
            .from("scenario_triggers")
            .update({ status: "failed" })
            .eq("id", trigger.id);
        }
      }

      return new Response(JSON.stringify({ success: true, processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process single trigger
    if (triggerId) {
      const { data: trigger, error } = await supabase
        .from("scenario_triggers")
        .select("*")
        .eq("id", triggerId)
        .single();

      if (error || !trigger) throw new Error("Trigger not found");
      const result = await generateScenarioFromTrigger(supabase, trigger);
      return new Response(JSON.stringify({ success: true, scenario: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect new triggers for a user
    if (userId) {
      const triggers = await detectTriggers(supabase, userId);
      return new Response(JSON.stringify({ success: true, triggers_created: triggers.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function detectTriggers(supabase: any, userId: string) {
  const createdTriggers: any[] = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. CONVERSATION TRIGGERS — comments with buying signals
  const { data: agency } = await supabase
    .from("agencies")
    .select("id")
    .eq("admin_user_id", userId)
    .single();

  if (agency) {
    const { data: signals } = await supabase
      .from("lead_signals")
      .select("id, comment_text, commenter_name, platform")
      .eq("agency_id", agency.id)
      .eq("status", "new")
      .gte("created_at", oneDayAgo)
      .limit(5);

    const buyingKeywords = ["price", "interested", "details", "cost", "available", "how much", "need help", "looking for"];

    for (const signal of signals || []) {
      const text = (signal.comment_text || "").toLowerCase();
      if (buyingKeywords.some((kw) => text.includes(kw))) {
        // Check if trigger already exists for this signal
        const { data: existing } = await supabase
          .from("scenario_triggers")
          .select("id")
          .eq("user_id", userId)
          .eq("trigger_type", "conversation")
          .contains("source_data", { signal_id: signal.id });

        if (!existing || existing.length === 0) {
          const { data: trigger } = await supabase
            .from("scenario_triggers")
            .insert({
              user_id: userId,
              trigger_type: "conversation",
              source_data: {
                signal_id: signal.id,
                comment_text: signal.comment_text,
                commenter_name: signal.commenter_name,
                platform: signal.platform,
                keywords_matched: buyingKeywords.filter((kw) => text.includes(kw)),
              },
            })
            .select()
            .single();
          if (trigger) createdTriggers.push(trigger);
        }
      }
    }

    // 2. MISTAKE TRIGGERS — conversations with no reply
    const { data: unreplied } = await supabase
      .from("social_conversations")
      .select("id, comment_text, commenter_name, platform, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .limit(3);

    for (const conv of unreplied || []) {
      const { data: existing } = await supabase
        .from("scenario_triggers")
        .select("id")
        .eq("user_id", userId)
        .eq("trigger_type", "mistake")
        .contains("source_data", { conversation_id: conv.id });

      if (!existing || existing.length === 0) {
        const { data: trigger } = await supabase
          .from("scenario_triggers")
          .insert({
            user_id: userId,
            trigger_type: "mistake",
            source_data: {
              conversation_id: conv.id,
              comment_text: conv.comment_text,
              commenter_name: conv.commenter_name,
              platform: conv.platform,
              hours_without_reply: Math.round((Date.now() - new Date(conv.created_at).getTime()) / 3600000),
            },
          })
          .select()
          .single();
        if (trigger) createdTriggers.push(trigger);
      }
    }
  }

  // 3. KNOWLEDGE TRIGGERS — recently uploaded documents
  const { data: recentDocs } = await supabase
    .from("shared_documents")
    .select("id, file_name, doc_title, document_category")
    .eq("uploaded_by", userId)
    .gte("created_at", oneDayAgo)
    .eq("processing_status", "completed")
    .limit(3);

  for (const doc of recentDocs || []) {
    const { data: existing } = await supabase
      .from("scenario_triggers")
      .select("id")
      .eq("user_id", userId)
      .eq("trigger_type", "knowledge")
      .contains("source_data", { document_id: doc.id });

    if (!existing || existing.length === 0) {
      const { data: trigger } = await supabase
        .from("scenario_triggers")
        .insert({
          user_id: userId,
          trigger_type: "knowledge",
          source_data: {
            document_id: doc.id,
            file_name: doc.file_name,
            doc_title: doc.doc_title,
            category: doc.document_category,
          },
        })
        .select()
        .single();
      if (trigger) createdTriggers.push(trigger);
    }
  }

  return createdTriggers;
}

async function generateScenarioFromTrigger(supabase: any, trigger: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const typeLabels: Record<string, string> = {
    conversation: "a real client interaction where someone expressed interest",
    mistake: "a missed opportunity where a comment went unanswered",
    knowledge: "a newly uploaded policy or training document",
  };

  const contextDescription = typeLabels[trigger.trigger_type] || "real system activity";
  const sourceJson = JSON.stringify(trigger.source_data, null, 2);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a trainer for home care agency staff. Based on ${contextDescription}, create a realistic training scenario.`,
        },
        {
          role: "user",
          content: `Based on this real situation from our system:\n\n${sourceJson}\n\nCreate a training scenario where staff must respond appropriately.\n\nReturn JSON with:\n- title (string)\n- scenario_text (string, the situation description)\n- category (one of: compliance, conversation, emergency, objection)\n- difficulty (easy, medium, or hard)\n- ideal_answer (string, the best response)\n- common_mistakes (string, mistakes to avoid)`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI error:", errText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResult = await response.json();
  const content = aiResult.choices?.[0]?.message?.content;
  if (!content) throw new Error("No AI response content");

  const scenario = JSON.parse(content);

  // Save scenario
  const { data: savedScenario, error: insertError } = await supabase
    .from("scenarios")
    .insert({
      created_by: trigger.user_id,
      title: scenario.title,
      scenario_text: scenario.scenario_text,
      category: scenario.category || "conversation",
      difficulty: scenario.difficulty || "medium",
      ideal_answer: scenario.ideal_answer,
      common_mistakes: scenario.common_mistakes,
      is_active: true,
      auto_generated: true,
      trigger_id: trigger.id,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Mark trigger as processed
  await supabase
    .from("scenario_triggers")
    .update({ status: "processed" })
    .eq("id", trigger.id);

  return savedScenario;
}
