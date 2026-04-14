import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { scenario_id, user_response } = await req.json();
    if (!scenario_id || !user_response?.trim()) {
      return new Response(JSON.stringify({ error: "scenario_id and user_response required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch scenario
    const { data: scenario, error: scErr } = await supabase
      .from("scenarios")
      .select("*")
      .eq("id", scenario_id)
      .single();

    if (scErr || !scenario) {
      return new Response(JSON.stringify({ error: "Scenario not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OpenAI key not configured");

    const prompt = `You are an evaluator for home care professionals.

SCENARIO:
${scenario.scenario_text}

IDEAL ANSWER:
${scenario.ideal_answer || "Not provided — use your professional judgment."}

COMMON MISTAKES TO WATCH FOR:
${scenario.common_mistakes || "None specified."}

DIFFICULTY LEVEL: ${scenario.difficulty}

USER'S RESPONSE:
${user_response}

Compare the user's response to the ideal answer. Score from 0 to 100 based on:
- Accuracy (does it address the scenario correctly?)
- Empathy (appropriate tone and compassion?)
- Clarity (clear and well-structured?)
- Professionalism (professional language and approach?)

Return ONLY valid JSON:
{
  "score": <number 0-100>,
  "feedback": "<overall assessment in 1-2 sentences>",
  "strengths": "<what the user did well>",
  "improvements": "<what needs improvement>",
  "better_answer": "<an improved version of the user's response>"
}`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert evaluator for home care professionals. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiResp.ok) throw new Error(`OpenAI error: ${aiResp.status}`);

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const evaluation = JSON.parse(jsonMatch[0]);

    // Save attempt
    const { data: attempt, error: insertErr } = await supabase
      .from("scenario_attempts")
      .insert({
        scenario_id,
        user_id: user.id,
        user_response: user_response.trim(),
        score: Math.min(100, Math.max(0, evaluation.score)),
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      attempt_id: attempt.id,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      better_answer: evaluation.better_answer,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
