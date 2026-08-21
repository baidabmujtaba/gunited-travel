create policy "receipts_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));

create policy "offer_images_read" on storage.objects for select to authenticated
  using (bucket_id = 'offer-images');
create policy "offer_images_staff_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'offer-images' and public.is_staff(auth.uid()));
create policy "offer_images_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'offer-images' and public.is_staff(auth.uid()));
create policy "offer_images_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'offer-images' and public.is_staff(auth.uid()));