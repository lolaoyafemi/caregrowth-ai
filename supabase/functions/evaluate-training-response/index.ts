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
    const { scenarioId, userId, userResponse, timeSpentSeconds } = await req.json();

    if (!scenarioId || !userId || !userResponse) {
      throw new Error("Missing required fields: scenarioId, userId, userResponse");
    }

    console.log(`Evaluating response for scenario: ${scenarioId}`);

    // Get scenario details
    const { data: scenario, error: scenarioError } = await supabase
      .from("training_scenarios")
      .select("*, shared_documents(document_category, doc_title)")
      .eq("id", scenarioId)
      .single();

    if (scenarioError || !scenario) {
      throw new Error("Scenario not found");
    }

    // Get relevant document chunks for context
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", scenario.document_id)
      .eq("is_shared", true)
      .limit(5);

    const referenceContent = chunks?.map((c) => c.content).join("\n\n") || "";

    // Get previous attempt count
    const { count: previousAttempts } = await supabase
      .from("training_responses")
      .select("*", { count: "exact", head: true })
      .eq("scenario_id", scenarioId)
      .eq("user_id", userId);

    const attemptNumber = (previousAttempts || 0) + 1;

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Evaluate response using AI
    const systemPrompt = `You are an expert home care training evaluator. Your task is to evaluate a trainee's response to a scenario and provide constructive feedback.

Evaluation criteria:
1. Empathy and tone - Does the response show understanding and compassion?
2. Accuracy - Does it align with best practices and the reference material?
3. Completeness - Does it address the key points expected?
4. Professionalism - Is it appropriate for a professional caregiving context?
5. Actionability - Does it provide clear next steps or helpful information?

Be encouraging but honest. Focus on practical improvements.`;

    const evaluationPrompt = `
## Scenario
**Title:** ${scenario.title}
**Description:** ${scenario.description}
${scenario.context ? `**Context:** ${scenario.context}` : ""}
**Prompt:** ${scenario.prompt_to_user}

## Expected Key Points
${scenario.expected_key_points?.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

## Reference Material (from training documents)
${referenceContent.slice(0, 5000)}

## Trainee's Response
${userResponse}

---
Evaluate this response thoroughly.`;

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
          { role: "user", content: evaluationPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_response",
              description: "Evaluate the trainee's response and provide structured feedback",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "integer",
                    description: "Score from 0-100",
                    minimum: 0,
                    maximum: 100,
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 2-4 specific strengths in the response",
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 2-4 specific areas for improvement",
                  },
                  example_response: {
                    type: "string",
                    description: "An example of an improved response based on the training materials",
                  },
                  key_points_addressed: {
                    type: "array",
                    items: { type: "string" },
                    description: "Which expected key points were addressed",
                  },
                  key_points_missed: {
                    type: "array",
                    items: { type: "string" },
                    description: "Which expected key points were missed",
                  },
                  overall_feedback: {
                    type: "string",
                    description: "Brief overall feedback summary (2-3 sentences)",
                  },
                },
                required: ["score", "strengths", "improvements", "example_response", "overall_feedback"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_response" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        user_response: userResponse,
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

    // Update user progress
    const { data: existingProgress } = await supabase
      .from("training_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("category", scenario.category)
      .single();

    if (existingProgress) {
      const newAttempts = existingProgress.scenarios_attempted + 1;
      const newCompleted = evaluation.score >= 70 
        ? existingProgress.scenarios_completed + 1 
        : existingProgress.scenarios_completed;
      const newAvgScore = 
        (existingProgress.average_score * existingProgress.scenarios_attempted + evaluation.score) / newAttempts;

      await supabase
        .from("training_progress")
        .update({
          scenarios_attempted: newAttempts,
          scenarios_completed: newCompleted,
          average_score: newAvgScore,
          best_score: Math.max(existingProgress.best_score || 0, evaluation.score),
          total_time_spent: existingProgress.total_time_spent + (timeSpentSeconds || 0),
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id);
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
      const newCompletions = evaluation.score >= 70 
        ? analytics.total_completions + 1 
        : analytics.total_completions;
      const newAvgScore = analytics.average_score
        ? (analytics.average_score * analytics.total_attempts + evaluation.score) / newAttempts
        : evaluation.score;

      // Track common mistakes
      const commonMistakes = [...(analytics.common_mistakes || [])];
      if (evaluation.key_points_missed) {
        evaluation.key_points_missed.forEach((missed: string) => {
          const existing = commonMistakes.find((m: any) => m.point === missed);
          if (existing) {
            existing.count += 1;
          } else {
            commonMistakes.push({ point: missed, count: 1 });
          }
        });
      }

      await supabase
        .from("training_analytics")
        .update({
          total_attempts: newAttempts,
          total_completions: newCompletions,
          average_score: newAvgScore,
          common_mistakes: commonMistakes.sort((a: any, b: any) => b.count - a.count).slice(0, 10),
          difficulty_rating: 100 - newAvgScore,
          updated_at: new Date().toISOString(),
        })
        .eq("scenario_id", scenarioId);
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
        },
        attempt_number: attemptNumber,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Evaluation error:", error);
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
