CREATE POLICY "homepage_videos_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'homepage-videos');