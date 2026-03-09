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
    const { scenarioId, userId, userResponse, timeSpentSeconds, conversationHistory } = await req.json();

    if (!scenarioId || !userId || (!userResponse && !conversationHistory)) {
      throw new Error("Missing required fields");
    }

    console.log(`Evaluating response for scenario: ${scenarioId}`);

    const { data: scenario, error: scenarioError } = await supabase
      .from("training_scenarios")
      .select("*, shared_documents(document_category, doc_title)")
      .eq("id", scenarioId)
      .single();

    if (scenarioError || !scenario) throw new Error("Scenario not found");

    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", scenario.document_id)
      .eq("is_shared", true)
      .limit(5);

    const referenceContent = chunks?.map((c) => c.content).join("\n\n") || "";

    const { count: previousAttempts } = await supabase
      .from("training_responses")
      .select("*", { count: "exact", head: true })
      .eq("scenario_id", scenarioId)
      .eq("user_id", userId);

    const attemptNumber = (previousAttempts || 0) + 1;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build the transcript from conversation history or plain response
    const transcript = conversationHistory 
      ? conversationHistory.map((m: any) => `${m.role === 'user' ? 'Staff' : 'Caller'}: ${m.content}`).join('\n\n')
      : userResponse;

    const systemPrompt = `You are an expert evaluator for home care agency staff training.
Evaluate this staff member's performance in a roleplay conversation.

Scenario: ${scenario.title}
Description: ${scenario.description}
Caller Persona: ${scenario.caller_persona || 'Family member'}
Primary Concern: ${scenario.primary_concern || 'N/A'}
Expected Key Points: ${scenario.expected_key_points?.join(', ') || 'N/A'}
Common Mistakes to Avoid: ${scenario.common_mistakes?.join(', ') || 'N/A'}

Reference Material:
${referenceContent.slice(0, 3000)}

Score breakdown criteria (each out of 100):
- Empathy: Emotional understanding, validation, compassionate tone
- Clarity: Clear explanations, no jargon, well-organized
- Discovery: Asking good questions, uncovering needs
- Confidence: Professional tone, authoritative but warm
- Next Steps: Providing clear action items, follow-up plans`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Conversation Transcript:\n\n${transcript}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "evaluate_response",
            description: "Evaluate the staff member's performance",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100 },
                strengths: { type: "array", items: { type: "string" } },
                improvements: { type: "array", items: { type: "string" } },
                example_response: { type: "string" },
                key_points_addressed: { type: "array", items: { type: "string" } },
                key_points_missed: { type: "array", items: { type: "string" } },
                overall_feedback: { type: "string" },
                score_breakdown: {
                  type: "object",
                  properties: {
                    empathy: { type: "number" },
                    clarity: { type: "number" },
                    discovery: { type: "number" },
                    confidence: { type: "number" },
                    next_steps: { type: "number" },
                  },
                  required: ["empathy", "clarity", "discovery", "confidence", "next_steps"]
                }
              },
              required: ["score", "strengths", "improvements", "example_response", "overall_feedback", "score_breakdown"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "evaluate_response" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    let evaluation: any = {
      score: 50,
      strengths: ["Response provided"],
      improvements: ["Could provide more detail"],
      example_response: "A more detailed response would include...",
      overall_feedback: "Good attempt. Keep practicing!",
      score_breakdown: { empathy: 50, clarity: 50, discovery: 50, confidence: 50, next_steps: 50 }
    };

    if (toolCall?.function?.arguments) {
      evaluation = JSON.parse(toolCall.function.arguments);
    }

    console.log(`Evaluation complete. Score: ${evaluation.score}`);

    // Save the response
    const { data: savedResponse, error: saveError } = await supabase
      .from("training_responses")
      .insert({
        scenario_id: scenarioId,
        user_id: userId,
        user_response: transcript,
        ai_evaluation: evaluation,
        score: evaluation.score,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        example_response: evaluation.example_response,
        time_spent_seconds: timeSpentSeconds || null,
        attempt_number: attemptNumber,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw new Error("Failed to save response");
    }

    // Update progress
    const { data: existingProgress } = await supabase
      .from("training_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("category", scenario.category)
      .single();

    if (existingProgress) {
      const newAttempts = existingProgress.scenarios_attempted + 1;
      const newCompleted = evaluation.score >= 70 ? existingProgress.scenarios_completed + 1 : existingProgress.scenarios_completed;
      const newAvgScore = (existingProgress.average_score * existingProgress.scenarios_attempted + evaluation.score) / newAttempts;

      await supabase.from("training_progress").update({
        scenarios_attempted: newAttempts,
        scenarios_completed: newCompleted,
        average_score: newAvgScore,
        best_score: Math.max(existingProgress.best_score || 0, evaluation.score),
        total_time_spent: existingProgress.total_time_spent + (timeSpentSeconds || 0),
        last_activity_at: new Date().toISOString(),
      }).eq("id", existingProgress.id);
    } else {
      await supabase.from("training_progress").insert({
        user_id: userId,
        category: scenario.category,
        scenarios_attempted: 1,
        scenarios_completed: evaluation.score >= 70 ? 1 : 0,
        average_score: evaluation.score,
        best_score: evaluation.score,
        total_time_spent: timeSpentSeconds || 0,
        last_activity_at: new Date().toISOString(),
      });
    }

    // Update analytics
    const { data: analytics } = await supabase
      .from("training_analytics")
      .select("*")
      .eq("scenario_id", scenarioId)
      .single();

    if (analytics) {
      const newAttempts = analytics.total_attempts + 1;
      const newCompletions = evaluation.score >= 70 ? analytics.total_completions + 1 : analytics.total_completions;
      const newAvgScore = analytics.average_score
        ? (analytics.average_score * analytics.total_attempts + evaluation.score) / newAttempts
        : evaluation.score;

      const commonMistakes = [...(analytics.common_mistakes || [])];
      if (evaluation.key_points_missed) {
        evaluation.key_points_missed.forEach((missed: string) => {
          const existing = commonMistakes.find((m: any) => m.point === missed);
          if (existing) existing.count += 1;
          else commonMistakes.push({ point: missed, count: 1 });
        });
      }

      await supabase.from("training_analytics").update({
        total_attempts: newAttempts,
        total_completions: newCompletions,
        average_score: newAvgScore,
        common_mistakes: commonMistakes.sort((a: any, b: any) => b.count - a.count).slice(0, 10),
        difficulty_rating: 100 - newAvgScore,
        updated_at: new Date().toISOString(),
      }).eq("scenario_id", scenarioId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response_id: savedResponse.id,
        evaluation: {
          score: evaluation.score,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          example_response: evaluation.example_response,
          overall_feedback: evaluation.overall_feedback,
          key_points_addressed: evaluation.key_points_addressed,
          key_points_missed: evaluation.key_points_missed,
          score_breakdown: evaluation.score_breakdown,
        },
        attempt_number: attemptNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Evaluation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});