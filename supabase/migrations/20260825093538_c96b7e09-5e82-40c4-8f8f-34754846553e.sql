DROP POLICY IF EXISTS "offer_images_public_read" ON storage.objects;
CREATE POLICY "offer_images_public_read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'offer-images');

DROP POLICY IF EXISTS "offer_images_staff_write" ON storage.objects;
CREATE POLICY "offer_images_staff_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'offer-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "offer_images_staff_update" ON storage.objects;
CREATE POLICY "offer_images_staff_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'offer-images' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'offer-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "offer_images_staff_delete" ON storage.objects;
CREATE POLICY "offer_images_staff_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'offer-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "order_docs_owner_insert" ON storage.objects;
CREATE POLICY "order_docs_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-documents'
  AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text)
);

DROP POLICY IF EXISTS "order_docs_owner_read" ON storage.objects;
CREATE POLICY "order_docs_owner_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'order-documents'
  AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text)
);

DROP POLICY IF EXISTS "order_docs_staff_manage" ON storage.objects;
CREATE POLICY "order_docs_staff_manage" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'order-documents' AND public.is_staff(auth.uid()));