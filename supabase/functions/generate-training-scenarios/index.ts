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
    const { documentId } = await req.json();

    console.log(`Generating scenarios for document: ${documentId}`);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("shared_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    // Get document chunks for content
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", documentId)
      .eq("is_shared", true)
      .order("chunk_index");

    if (chunksError || !chunks || chunks.length === 0) {
      throw new Error("No processed content found for document");
    }

    const documentContent = chunks.map(c => c.content).join("\n\n");
    console.log(`Document content length: ${documentContent.length}`);

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate scenarios using AI
    const systemPrompt = `You are an expert training content designer for home care agencies. 
Your task is to extract and generate realistic training scenarios from training documents.

For each scenario you create:
1. Identify real conversation examples, scripts, FAQs, or decision points from the document
2. Create a realistic situation summary that sets the context
3. Identify the caller persona (e.g., "Daughter", "Spouse", "Social Worker")
4. Identify the care situation (e.g., "Father has advancing dementia")
5. Identify the primary concern (e.g., "Cost of care", "Caregiver trust")
6. Write an initial prompt asking the trainee how they would respond
7. List 3-5 key points that should be in a good response
8. List common mistakes to avoid (e.g., "Rushing to quote price", "Sounding dismissive")
9. Assign an emotional tone for the caller (e.g., "Anxious", "Defensive", "Overwhelmed")
10. Assign a difficulty level (easy, medium, hard)
11. Add relevant tags for categorization

Supported scenario categories:
- Intake Calls
- Cost & Payment Questions
- Dementia / Memory Care
- Hospital Discharge
- Caregiver Burnout
- Trust & Safety

Return scenarios in this exact JSON format:
{
  "scenarios": [
    {
      "title": "Brief scenario title",
      "category": "Intake Calls",
      "description": "Detailed scenario description setting the context",
      "caller_persona": "Anxious Daughter",
      "care_situation": "Mother recovering from fall",
      "primary_concern": "Safety at night",
      "prompt_to_user": "Question asking how they would respond",
      "expected_key_points": ["point1", "point2", "point3"],
      "common_mistakes": ["mistake1", "mistake2"],
      "emotional_tone": "Anxious",
      "difficulty_level": "medium",
      "scenario_type": "conversation",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Generate 3-5 high-quality, diverse scenarios from this document. Focus on practical situations caregivers and agency staff actually encounter.`;

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
          { 
            role: "user", 
            content: `Document Category: ${document.document_category}\nDocument Title: ${document.doc_title || document.file_name}\n\nDocument Content:\n${documentContent.slice(0, 15000)}` 
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_training_scenarios",
              description: "Create training scenarios from document content",
              parameters: {
                type: "object",
                properties: {
                  scenarios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        category: { type: "string" },
                        description: { type: "string" },
                        caller_persona: { type: "string" },
                        care_situation: { type: "string" },
                        primary_concern: { type: "string" },
                        prompt_to_user: { type: "string" },
                        expected_key_points: { type: "array", items: { type: "string" } },
                        common_mistakes: { type: "array", items: { type: "string" } },
                        emotional_tone: { type: "string" },
                        difficulty_level: { type: "string", enum: ["easy", "medium", "hard"] },
                        scenario_type: { type: "string", enum: ["conversation", "faq", "decision", "script"] },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "category", "description", "caller_persona", "care_situation", "primary_concern", "prompt_to_user", "expected_key_points", "common_mistakes", "emotional_tone", "difficulty_level", "scenario_type"],
                    },
                  },
                },
                required: ["scenarios"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_training_scenarios" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("AI response received");

    // Extract scenarios from tool call response
    let scenarios: any[] = [];
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      scenarios = parsed.scenarios || [];
    }

    if (scenarios.length === 0) {
      throw new Error("No scenarios generated from document");
    }

    console.log(`Generated ${scenarios.length} scenarios`);

    // Store scenarios in database
    const scenariosToInsert = scenarios.map((s: any) => ({
      document_id: documentId,
      category: document.document_category,
      scenario_type: s.scenario_type || "conversation",
      title: s.title,
      description: s.description,
      context: s.context || null,
      prompt_to_user: s.prompt_to_user,
      expected_key_points: s.expected_key_points,
      difficulty_level: s.difficulty_level || "medium",
      tags: s.tags || [],
      is_active: true,
    }));

    const { data: insertedScenarios, error: insertError } = await supabase
      .from("training_scenarios")
      .insert(scenariosToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save scenarios");
    }

    // Initialize analytics for each scenario
    const analyticsToInsert = insertedScenarios.map((s: any) => ({
      scenario_id: s.id,
      category: s.category,
    }));

    await supabase.from("training_analytics").insert(analyticsToInsert);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: documentId,
        scenarios_generated: insertedScenarios.length,
        scenarios: insertedScenarios,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Scenario generation error:", error);
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
