
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandStyle {
  id: string;
  user_id: string;
  selected_template_theme: string;
  brand_primary_color: string;
  brand_accent_color: string;
  brand_font_style: string;
  optional_logo_url: string | null;
  brand_display_name: string | null;
}

const DEFAULT_BRAND_STYLE: Omit<BrandStyle, 'id' | 'user_id'> = {
  selected_template_theme: 'quote_card',
  brand_primary_color: '#1a56db',
  brand_accent_color: '#7c3aed',
  brand_font_style: 'modern',
  optional_logo_url: null,
  brand_display_name: null,
};

export function useBrandStyle() {
  const [brandStyle, setBrandStyle] = useState<BrandStyle | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const fetchBrandStyle = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data, error } = await supabase
        .from('brand_styles')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBrandStyle(data as BrandStyle);
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
      }
    } catch (err) {
      console.error('Error fetching brand style:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandStyle();
  }, [fetchBrandStyle]);

  const saveBrandStyle = async (style: Partial<Omit<BrandStyle, 'id' | 'user_id'>>) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) throw new Error('Not authenticated');

    const payload = {
      user_id: userData.user.id,
      ...DEFAULT_BRAND_STYLE,
      ...style,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('brand_styles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    setBrandStyle(data as BrandStyle);
    setNeedsSetup(false);
    return data as BrandStyle;
  };

  return { brandStyle, loading, needsSetup, saveBrandStyle, refetch: fetchBrandStyle };
}
