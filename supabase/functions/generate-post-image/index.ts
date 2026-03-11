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

// ─── Carousel slide SVG (with slide number indicator) ─────────────────

function renderCarouselSlide(
  text: string,
  slideIndex: number,
  totalSlides: number,
  businessName: string,
  template: TemplateName,
  brand: BrandColors,
  isLastSlide: boolean,
): string {
  const W = 1080, H = 1080;
  const font = brand.font;
  const lines = wrapText(text, isLastSlide ? 28 : 24);
  const fs = lines.length > 3 ? 44 : 54;
  const totalTextHeight = lines.length * (fs + 14);
  const startY = Math.max(300, (H / 2) - (totalTextHeight / 2) + fs);

  // Slide indicator dots
  const dotsSvg = Array.from({ length: totalSlides }, (_, i) =>
    `<circle cx="${540 - ((totalSlides - 1) * 12) + i * 24}" cy="${H - 50}" r="5" fill="${i === slideIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}" />`
  ).join('\n  ');

  if (template === 'quote_card') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${brand.primary}"/>
    <stop offset="100%" stop-color="${brand.accent}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${slideIndex === 0 ? `<text x="100" y="200" font-family="${font}" font-size="160" fill="rgba(255,255,255,0.1)" font-weight="bold">"</text>` : ''}
  ${lines.map((l, i) =>
    `<text x="540" y="${startY + i * (fs + 14)}" font-family="${font}" font-size="${fs}" font-weight="${isLastSlide ? 'bold' : 'normal'}" fill="white" text-anchor="middle">${escapeXml(l)}</text>`
  ).join('\n  ')}
  <text x="540" y="${H - 90}" font-family="${font}" font-size="20" fill="rgba(255,255,255,0.5)" text-anchor="middle" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
  ${dotsSvg}
</svg>`;
  }

  if (template === 'minimalist') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa"/>
  <rect x="100" y="100" width="${60 + slideIndex * 20}" height="5" rx="3" fill="${brand.primary}"/>
  ${lines.map((l, i) =>
    `<text x="100" y="${startY + i * (fs + 12)}" font-family="${font}" font-size="${fs}" font-weight="${isLastSlide ? 'bold' : 'normal'}" fill="#111827">${escapeXml(l)}</text>`
  ).join('\n  ')}
  <text x="100" y="${H - 90}" font-family="${font}" font-size="20" fill="#9ca3af" letter-spacing="2">${escapeXml(businessName.toUpperCase())}</text>
  ${dotsSvg.replace(/rgba\(255,255,255,0\.9\)/g, brand.primary).replace(/rgba\(255,255,255,0\.3\)/g, '#d1d5db')}
</svg>`;
  }

  // dark_mode
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>
  <circle cx="${800 + slideIndex * 50}" cy="200" r="250" fill="${brand.accent}" opacity="0.06"/>
  <rect x="100" y="140" width="${40 + slideIndex * 15}" height="5" rx="3" fill="${brand.primary}"/>
  ${lines.map((l, i) =>
    `<text x="100" y="${startY + i * (fs + 14)}" font-family="${font}" font-size="${fs}" font-weight="${isLastSlide ? 'bold' : 'normal'}" fill="white">${escapeXml(l)}</text>`
  ).join('\n  ')}
  <text x="100" y="${H - 90}" font-family="${font}" font-size="20" fill="rgba(255,255,255,0.35)" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
  ${dotsSvg}
</svg>`;
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
            brand_primary_color, brand_accent_color, brand_font_style,
            post_format, slide_texts } = body;

    const isCarousel = post_format === 'carousel' && Array.isArray(slide_texts) && slide_texts.length > 0;
    const finalHeadline = headline || 'Your Post';

    if (!post_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: post_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve brand colors
    let brand: BrandColors = { ...DEFAULT_BRAND };

    if (brand_primary_color || brand_accent_color || brand_font_style) {
      brand = {
        primary: brand_primary_color || DEFAULT_BRAND.primary,
        accent: brand_accent_color || DEFAULT_BRAND.accent,
        font: FONT_MAP[brand_font_style] || DEFAULT_BRAND.font,
      };
    } else {
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

    if (isCarousel) {
      // ── Carousel: render multiple slides ──
      console.log(`Rendering carousel (${slide_texts.length} slides) for post ${post_id}`);
      const imageUrls: string[] = [];

      for (let i = 0; i < slide_texts.length; i++) {
        const isLast = i === slide_texts.length - 1;
        const svg = renderCarouselSlide(
          slide_texts[i], i, slide_texts.length, businessLabel,
          selectedTemplate, brand, isLast,
        );

        const svgBytes = new TextEncoder().encode(svg);
        const filePath = `${user.id}/${post_id}-slide-${i}-${Date.now()}.svg`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, svgBytes, { contentType: 'image/svg+xml', upsert: true });

        if (uploadError) throw new Error(`Upload slide ${i} failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
        imageUrls.push(urlData.publicUrl);
      }

      // Store first slide as main image_url
      const primaryImage = imageUrls[0];
      await supabase
        .from('content_posts')
        .update({
          image_url: primaryImage,
          headline: finalHeadline,
          subheadline: subheadline || null,
        })
        .eq('id', post_id);

      return new Response(JSON.stringify({
        image_url: primaryImage,
        image_urls: imageUrls,
        template: selectedTemplate,
        post_format: 'carousel',
        slide_count: imageUrls.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Single image ──
    console.log(`Rendering "${selectedTemplate}" for post ${post_id}, brand: ${brand.primary}/${brand.accent}`);

    const svg = renderSvg(finalHeadline, subheadline || '', businessLabel, selectedTemplate, brand);
    const svgBytes = new TextEncoder().encode(svg);

    const filePath = `${user.id}/${post_id}-${Date.now()}.svg`;
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, svgBytes, { contentType: 'image/svg+xml', upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    await supabase
      .from('content_posts')
      .update({ image_url: publicUrl, headline: finalHeadline, subheadline: subheadline || null })
      .eq('id', post_id);

    return new Response(JSON.stringify({ image_url: publicUrl, template: selectedTemplate, post_format: 'single' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-post-image:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
