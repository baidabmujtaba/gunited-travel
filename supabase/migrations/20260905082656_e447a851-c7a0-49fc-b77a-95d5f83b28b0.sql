CREATE POLICY "Admins can upload homepage videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'homepage-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can read homepage videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'homepage-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update homepage videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'homepage-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete homepage videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'homepage-videos' AND public.is_admin(auth.uid()));