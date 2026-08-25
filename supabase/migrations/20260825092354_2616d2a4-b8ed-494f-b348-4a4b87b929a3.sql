CREATE POLICY invoices_files_staff_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoices' AND public.is_staff(auth.uid()));

CREATE POLICY invoices_files_staff_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices' AND public.is_staff(auth.uid()));

CREATE POLICY invoices_files_staff_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoices' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'invoices' AND public.is_staff(auth.uid()));