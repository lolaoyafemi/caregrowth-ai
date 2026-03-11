import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.substring(7));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const body = await req.json();
    const { hook_line, headline, subheadline, business_name, post_id, platform } = body;

    if (!post_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: post_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const contentHint = hook_line || headline || 'professional social media post';
    const businessLabel = business_name || '';
    const platformLabel = platform || 'social media';

    const prompt = `Generate a professional, visually appealing social media image for ${platformLabel}. The image should relate to this topic: "${contentHint}". ${businessLabel ? `Brand: ${businessLabel}.` : ''} Style: clean, modern, high-quality photography or illustration style. No text overlays. Square format 1080x1080. Make it eye-catching and suitable for a home care or healthcare business.`;

    console.log(`Generating image with Gemini for post ${post_id}, platform: ${platformLabel}`);

    // Call Gemini image generation API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
    
    let imageData: string | null = null;
    
    // Try up to 3 times with backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
              responseMimeType: "image/png",
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Gemini API error (attempt ${attempt + 1}): ${response.status} ${errText}`);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(`Gemini API error: ${response.status}`);
        }

        const result = await response.json();
        
        // Extract base64 image from response
        const parts = result?.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              imageData = part.inlineData.data;
              break;
            }
          }
        }

        if (imageData) break;
        
        console.warn(`No image in Gemini response (attempt ${attempt + 1})`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      } catch (e) {
        console.error(`Attempt ${attempt + 1} failed:`, e);
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    if (!imageData) {
      throw new Error('Failed to generate image after 3 attempts');
    }

    // Decode base64 and upload to Supabase storage
    const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const filePath = `${user.id}/${post_id}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, imageBytes, { contentType: 'image/png', upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    await supabase
      .from('content_posts')
      .update({ image_url: publicUrl, headline: headline || null, subheadline: subheadline || null })
      .eq('id', post_id);

    console.log(`Image generated and uploaded: ${filePath}`);

    return new Response(JSON.stringify({ image_url: publicUrl, post_format: 'single' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-post-image:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
