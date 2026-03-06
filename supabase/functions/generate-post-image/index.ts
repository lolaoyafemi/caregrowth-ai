import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── SVG Template Rendering ───────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Word-wrap text into lines that fit within maxChars per line */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current.length + 1 + word.length) > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type TemplateName = 'quote_card' | 'minimalist' | 'dark_mode';

function renderSvg(
  headline: string,
  subheadline: string,
  businessName: string,
  template: TemplateName,
): string {
  const W = 1080;
  const H = 1080;

  const headlineLines = wrapText(headline, 22);
  const subLines = subheadline ? wrapText(subheadline, 40) : [];

  if (template === 'quote_card') {
    // Template A — Quote Card: brand blue bg, white text
    const headlineFontSize = headlineLines.length > 2 ? 52 : 64;
    const startY = 380 - (headlineLines.length - 1) * (headlineFontSize * 0.6);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a56db"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- decorative quote mark -->
  <text x="100" y="220" font-family="Georgia, serif" font-size="200" fill="rgba(255,255,255,0.12)" font-weight="bold">"</text>
  <!-- headline -->
  ${headlineLines.map((line, i) =>
    `<text x="540" y="${startY + i * (headlineFontSize + 14)}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${headlineFontSize}" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(line)}</text>`
  ).join('\n  ')}
  <!-- subheadline -->
  ${subLines.map((line, i) =>
    `<text x="540" y="${startY + headlineLines.length * (headlineFontSize + 14) + 40 + i * 38}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.85)" text-anchor="middle">${escapeXml(line)}</text>`
  ).join('\n  ')}
  <!-- brand name -->
  <text x="540" y="${H - 80}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
  <!-- bottom accent line -->
  <rect x="440" y="${H - 60}" width="200" height="3" rx="2" fill="rgba(255,255,255,0.3)"/>
</svg>`;
  }

  if (template === 'minimalist') {
    // Template B — Minimalist: white bg, dark text
    const headlineFontSize = headlineLines.length > 2 ? 48 : 58;
    const startY = 400 - (headlineLines.length - 1) * (headlineFontSize * 0.6);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa"/>
  <!-- top accent bar -->
  <rect x="100" y="120" width="80" height="6" rx="3" fill="#1a56db"/>
  <!-- headline -->
  ${headlineLines.map((line, i) =>
    `<text x="100" y="${startY + i * (headlineFontSize + 12)}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${headlineFontSize}" font-weight="bold" fill="#111827">${escapeXml(line)}</text>`
  ).join('\n  ')}
  <!-- subheadline -->
  ${subLines.map((line, i) =>
    `<text x="100" y="${startY + headlineLines.length * (headlineFontSize + 12) + 40 + i * 34}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="26" fill="#6b7280">${escapeXml(line)}</text>`
  ).join('\n  ')}
  <!-- brand name -->
  <text x="100" y="${H - 80}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22" fill="#9ca3af" letter-spacing="2">${escapeXml(businessName.toUpperCase())}</text>
</svg>`;
  }

  // Template C — Dark Mode Card: black bg, white text, blue accent
  const headlineFontSize = headlineLines.length > 2 ? 50 : 62;
  const startY = 380 - (headlineLines.length - 1) * (headlineFontSize * 0.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>
  <!-- accent glow -->
  <circle cx="900" cy="200" r="300" fill="rgba(59,130,246,0.08)"/>
  <!-- accent bar -->
  <rect x="100" y="180" width="60" height="6" rx="3" fill="#3b82f6"/>
  <!-- headline -->
  ${headlineLines.map((line, i) =>
    `<text x="100" y="${startY + i * (headlineFontSize + 14)}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${headlineFontSize}" font-weight="bold" fill="white">${escapeXml(line)}</text>`
  ).join('\n  ')}
  <!-- subheadline -->
  ${subLines.map((line, i) =>
    `<text x="100" y="${startY + headlineLines.length * (headlineFontSize + 14) + 40 + i * 36}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="26" fill="#93c5fd">${escapeXml(line)}</text>`
  ).join('\n  ')}
  <!-- brand name -->
  <text x="100" y="${H - 80}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.4)" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
</svg>`;
}

/** Convert SVG string to PNG using resvg-wasm */
async function svgToPng(svg: string): Promise<Uint8Array> {
  // Use resvg-wasm for server-side SVG→PNG rendering in Deno
  const { Resvg, initWasm } = await import('https://esm.sh/@aspect-dev/resvg-wasm@1.0.4');
  
  // Fetch and initialize WASM
  const wasmResponse = await fetch('https://esm.sh/@aspect-dev/resvg-wasm@1.0.4/resvg.wasm');
  const wasmBytes = await wasmResponse.arrayBuffer();
  try {
    await initWasm(wasmBytes);
  } catch (_e) {
    // Already initialized — ignore
  }
  
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1080 },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

// ─── Template Selection Logic ─────────────────────────────────────────

function selectTemplate(platform: string): TemplateName {
  // Rotate templates based on timestamp for variety
  const templates: TemplateName[] = ['quote_card', 'minimalist', 'dark_mode'];
  const seed = Date.now();
  
  // Platform preference: instagram likes quote cards, linkedin likes minimalist
  if (platform === 'instagram') {
    return templates[seed % 3]; // all three work well
  }
  if (platform === 'linkedin') {
    return seed % 2 === 0 ? 'minimalist' : 'dark_mode';
  }
  if (platform === 'x') {
    return seed % 2 === 0 ? 'dark_mode' : 'minimalist';
  }
  // facebook and others
  return templates[seed % 3];
}

// ─── Main Handler ─────────────────────────────────────────────────────

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

    const { headline, subheadline, business_name, post_id, platform, template } = await req.json();

    // Support legacy callers that pass hook_line instead of headline
    const finalHeadline = headline || (await req.clone().json().catch(() => ({}))).hook_line || 'Your Post';

    if (!post_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: post_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const selectedTemplate: TemplateName = template || selectTemplate(platform || 'instagram');
    const businessLabel = business_name || 'Your Business';

    console.log(`Rendering template "${selectedTemplate}" for post ${post_id}, headline: "${finalHeadline}"`);

    // Render SVG and convert to PNG
    const svg = renderSvg(finalHeadline, subheadline || '', businessLabel, selectedTemplate);
    
    let pngData: Uint8Array;
    try {
      pngData = await svgToPng(svg);
    } catch (renderError) {
      console.error('SVG→PNG render failed, trying fallback:', renderError);
      // Fallback: store SVG as-is (less ideal but functional)
      pngData = new TextEncoder().encode(svg);
    }

    console.log(`Image rendered: ${pngData.length} bytes`);

    // Upload to post-images bucket
    const filePath = `${user.id}/${post_id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, pngData, {
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

    // Update the content_posts record with image URL and structured fields
    const { error: updateError } = await supabase
      .from('content_posts')
      .update({
        image_url: publicUrl,
        headline: finalHeadline,
        subheadline: subheadline || null,
      })
      .eq('id', post_id);

    if (updateError) {
      console.error('DB update error:', updateError);
    }

    console.log('Template image generated and stored:', publicUrl);

    return new Response(JSON.stringify({ image_url: publicUrl, template: selectedTemplate }), {
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
