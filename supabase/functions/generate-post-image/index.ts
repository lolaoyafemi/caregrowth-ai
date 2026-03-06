import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── SVG Helpers ──────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

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

const FONT_MAP: Record<string, string> = {
  modern: "'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
  rounded: "'Trebuchet MS', 'Lucida Grande', sans-serif",
};

type TemplateName = 'quote_card' | 'minimalist' | 'dark_mode';

interface BrandColors {
  primary: string;
  accent: string;
  font: string;
}

const DEFAULT_BRAND: BrandColors = {
  primary: '#1a56db',
  accent: '#7c3aed',
  font: FONT_MAP.modern,
};

// ─── SVG Templates ────────────────────────────────────────────────────

function renderSvg(
  headline: string,
  subheadline: string,
  businessName: string,
  template: TemplateName,
  brand: BrandColors,
): string {
  const W = 1080, H = 1080;
  const headlineLines = wrapText(headline, 22);
  const subLines = subheadline ? wrapText(subheadline, 40) : [];
  const font = brand.font;

  if (template === 'quote_card') {
    const fs = headlineLines.length > 2 ? 52 : 64;
    const startY = 380 - (headlineLines.length - 1) * (fs * 0.6);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${brand.primary}"/>
    <stop offset="100%" stop-color="${brand.accent}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="100" y="220" font-family="${font}" font-size="200" fill="rgba(255,255,255,0.12)" font-weight="bold">"</text>
  ${headlineLines.map((l, i) =>
    `<text x="540" y="${startY + i * (fs + 14)}" font-family="${font}" font-size="${fs}" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(l)}</text>`
  ).join('\n  ')}
  ${subLines.map((l, i) =>
    `<text x="540" y="${startY + headlineLines.length * (fs + 14) + 40 + i * 38}" font-family="${font}" font-size="28" fill="rgba(255,255,255,0.85)" text-anchor="middle">${escapeXml(l)}</text>`
  ).join('\n  ')}
  <text x="540" y="${H - 80}" font-family="${font}" font-size="24" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
  <rect x="440" y="${H - 60}" width="200" height="3" rx="2" fill="rgba(255,255,255,0.3)"/>
</svg>`;
  }

  if (template === 'minimalist') {
    const fs = headlineLines.length > 2 ? 48 : 58;
    const startY = 400 - (headlineLines.length - 1) * (fs * 0.6);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa"/>
  <rect x="100" y="120" width="80" height="6" rx="3" fill="${brand.primary}"/>
  ${headlineLines.map((l, i) =>
    `<text x="100" y="${startY + i * (fs + 12)}" font-family="${font}" font-size="${fs}" font-weight="bold" fill="#111827">${escapeXml(l)}</text>`
  ).join('\n  ')}
  ${subLines.map((l, i) =>
    `<text x="100" y="${startY + headlineLines.length * (fs + 12) + 40 + i * 34}" font-family="${font}" font-size="26" fill="#6b7280">${escapeXml(l)}</text>`
  ).join('\n  ')}
  <text x="100" y="${H - 80}" font-family="${font}" font-size="22" fill="#9ca3af" letter-spacing="2">${escapeXml(businessName.toUpperCase())}</text>
</svg>`;
  }

  // dark_mode
  const fs = headlineLines.length > 2 ? 50 : 62;
  const startY = 380 - (headlineLines.length - 1) * (fs * 0.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>
  <circle cx="900" cy="200" r="300" fill="${brand.accent}" opacity="0.08"/>
  <rect x="100" y="180" width="60" height="6" rx="3" fill="${brand.primary}"/>
  ${headlineLines.map((l, i) =>
    `<text x="100" y="${startY + i * (fs + 14)}" font-family="${font}" font-size="${fs}" font-weight="bold" fill="white">${escapeXml(l)}</text>`
  ).join('\n  ')}
  ${subLines.map((l, i) =>
    `<text x="100" y="${startY + headlineLines.length * (fs + 14) + 40 + i * 36}" font-family="${font}" font-size="26" fill="${brand.accent}" opacity="0.8">${escapeXml(l)}</text>`
  ).join('\n  ')}
  <text x="100" y="${H - 80}" font-family="${font}" font-size="22" fill="rgba(255,255,255,0.4)" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
</svg>`;
}

async function svgToPng(svg: string): Promise<Uint8Array> {
  const { Resvg, initWasm } = await import('https://esm.sh/@aspect-dev/resvg-wasm@1.0.4');
  const wasmResponse = await fetch('https://esm.sh/@aspect-dev/resvg-wasm@1.0.4/resvg.wasm');
  const wasmBytes = await wasmResponse.arrayBuffer();
  try { await initWasm(wasmBytes); } catch (_e) { /* already init */ }
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } });
  return resvg.render().asPng();
}

function selectTemplate(platform: string): TemplateName {
  const templates: TemplateName[] = ['quote_card', 'minimalist', 'dark_mode'];
  const seed = Date.now();
  if (platform === 'linkedin') return seed % 2 === 0 ? 'minimalist' : 'dark_mode';
  if (platform === 'x') return seed % 2 === 0 ? 'dark_mode' : 'minimalist';
  return templates[seed % 3];
}

// ─── Main ─────────────────────────────────────────────────────────────

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

    const body = await req.json();
    const { headline, subheadline, business_name, post_id, platform, template,
            brand_primary_color, brand_accent_color, brand_font_style } = body;

    const finalHeadline = headline || 'Your Post';

    if (!post_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: post_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve brand colors: use request params, fall back to DB brand_styles, then defaults
    let brand: BrandColors = { ...DEFAULT_BRAND };

    if (brand_primary_color || brand_accent_color || brand_font_style) {
      brand = {
        primary: brand_primary_color || DEFAULT_BRAND.primary,
        accent: brand_accent_color || DEFAULT_BRAND.accent,
        font: FONT_MAP[brand_font_style] || DEFAULT_BRAND.font,
      };
    } else {
      // Try fetching from brand_styles table
      const { data: styleData } = await supabase
        .from('brand_styles')
        .select('brand_primary_color, brand_accent_color, brand_font_style')
        .eq('user_id', user.id)
        .maybeSingle();

      if (styleData) {
        brand = {
          primary: styleData.brand_primary_color || DEFAULT_BRAND.primary,
          accent: styleData.brand_accent_color || DEFAULT_BRAND.accent,
          font: FONT_MAP[styleData.brand_font_style] || DEFAULT_BRAND.font,
        };
      }
    }

    const selectedTemplate: TemplateName = template || selectTemplate(platform || 'instagram');
    const businessLabel = business_name || 'Your Business';

    console.log(`Rendering "${selectedTemplate}" for post ${post_id}, brand: ${brand.primary}/${brand.accent}`);

    const svg = renderSvg(finalHeadline, subheadline || '', businessLabel, selectedTemplate, brand);

    let pngData: Uint8Array;
    try {
      pngData = await svgToPng(svg);
    } catch (renderError) {
      console.error('SVG→PNG render failed:', renderError);
      pngData = new TextEncoder().encode(svg);
    }

    const filePath = `${user.id}/${post_id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, pngData, { contentType: 'image/png', upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    await supabase
      .from('content_posts')
      .update({ image_url: publicUrl, headline: finalHeadline, subheadline: subheadline || null })
      .eq('id', post_id);

    return new Response(JSON.stringify({ image_url: publicUrl, template: selectedTemplate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-post-image:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
