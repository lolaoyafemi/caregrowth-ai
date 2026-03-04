import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { hook_line, sub_line, business_name, post_id, platform } = await req.json();

    if (!hook_line || !post_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Platform-specific color schemes
    const platformStyles: Record<string, { bg: string; accent: string }> = {
      facebook: { bg: 'deep blue (#1877F2)', accent: 'white' },
      instagram: { bg: 'warm gradient purple-to-orange', accent: 'white' },
      linkedin: { bg: 'professional dark blue (#0A66C2)', accent: 'white' },
      x: { bg: 'black (#000000)', accent: 'white' },
    };

    const style = platformStyles[platform] || platformStyles.linkedin;

    const prompt = `Generate a clean, modern branded social media card image for ${platform || 'social media'}. 
Square 1:1 aspect ratio, 1080x1080 pixels.
Background: solid ${style.bg} with subtle geometric pattern or gradient.
Text layout: centered, bold ${style.accent} sans-serif headline text reading: "${hook_line}"
${sub_line ? `Below that in smaller ${style.accent} text: "${sub_line}"` : ''}
At the bottom, small ${style.accent} text: "${business_name || 'Your Business'}"
Style: professional, minimalist, high contrast, social-media-ready branded card.
No photos of people. No stock imagery. Text-based design only.
Ultra high resolution.`;

    console.log('Generating image with DALL-E 3, prompt:', prompt.substring(0, 200));

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Retry up to 3 times with exponential backoff
    let lastError: Error | null = null;
    let imageUrl: string | undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`OpenAI error (attempt ${attempt + 1}):`, response.status, errText);
          lastError = new Error(`Image generation failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        imageUrl = data.data?.[0]?.url;

        if (!imageUrl) {
          console.error('No image URL in response:', JSON.stringify(data).substring(0, 500));
          lastError = new Error('No image URL in response');
          continue;
        }

        break; // Success
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err);
        lastError = err as Error;
      }
    }

    if (!imageUrl) {
      throw lastError || new Error('Image generation failed after retries');
    }

    // Fetch image bytes from the OpenAI URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
    }
    const binaryData = new Uint8Array(await imageResponse.arrayBuffer());

    // Upload to post-images bucket
    const filePath = `${user.id}/${post_id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, binaryData, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update the content_posts record
    const { error: updateError } = await supabase
      .from('content_posts')
      .update({ image_url: publicUrl })
      .eq('id', post_id);

    if (updateError) {
      console.error('DB update error:', updateError);
    }

    console.log('Image generated and stored:', publicUrl);

    return new Response(JSON.stringify({ image_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-post-image:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
