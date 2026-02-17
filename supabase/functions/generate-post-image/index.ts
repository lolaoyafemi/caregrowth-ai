import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
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

    console.log('Generating image with prompt:', prompt.substring(0, 200));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', errText);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated');
    }

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

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
