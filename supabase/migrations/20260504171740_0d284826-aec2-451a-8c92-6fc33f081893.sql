
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = id
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  AND credits = (SELECT credits FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
