
-- Create content_batches table
CREATE TABLE public.content_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  days INTEGER NOT NULL,
  platforms TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.content_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
  ON public.content_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches"
  ON public.content_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches"
  ON public.content_batches FOR DELETE
  USING (auth.uid() = user_id);

-- Create content_posts table
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_id UUID REFERENCES public.content_batches(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_body TEXT NOT NULL,
  image_url TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content posts"
  ON public.content_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content posts"
  ON public.content_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content posts"
  ON public.content_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content posts"
  ON public.content_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_content_posts_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();

-- Add image_url column to scheduled_posts for backward compat
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post images
CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
