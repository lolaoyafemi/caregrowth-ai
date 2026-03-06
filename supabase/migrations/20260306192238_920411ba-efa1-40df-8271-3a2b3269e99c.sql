
CREATE TABLE public.brand_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_template_theme text NOT NULL DEFAULT 'quote_card',
  brand_primary_color text NOT NULL DEFAULT '#1a56db',
  brand_accent_color text NOT NULL DEFAULT '#7c3aed',
  brand_font_style text NOT NULL DEFAULT 'modern',
  optional_logo_url text,
  brand_display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.brand_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand styles"
  ON public.brand_styles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand styles"
  ON public.brand_styles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand styles"
  ON public.brand_styles FOR UPDATE
  USING (auth.uid() = user_id);
