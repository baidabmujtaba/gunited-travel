CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  existing_count integer;
  assigned_role app_role;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count < 2 then
    assigned_role := 'super_admin';
  else
    assigned_role := 'client';
  end if;

  insert into public.profiles (id, email, full_name, whatsapp, must_change_password)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'whatsapp',''),
    assigned_role = 'super_admin')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role)
  on conflict do nothing;

  if assigned_role = 'client' then
    insert into public.notifications (audience, title_en, title_ar, body_en, body_ar, link)
    values ('staff', 'New customer registered', 'تسجيل عميل جديد',
      coalesce(new.email, 'A new customer') || ' created an account.',
      coalesce(new.email, 'عميل جديد') || ' أنشأ حسابًا جديدًا.',
      '/admin/customers');
  end if;

  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.notify_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  tracking text;
begin
  select tracking_id into tracking from public.service_orders where id = new.order_id;

  insert into public.notifications (audience, title_en, title_ar, body_en, body_ar, link)
  values ('staff', 'Document uploaded', 'تم رفع مستند',
    'Document "' || new.label_en || '" was uploaded for order ' || coalesce(tracking, ''),
    'تم رفع مستند "' || new.label_ar || '" للطلب ' || coalesce(tracking, ''),
    '/admin');

  return new;
end $function$;

DROP TRIGGER IF EXISTS order_documents_notify ON public.order_documents;
CREATE TRIGGER order_documents_notify
AFTER INSERT ON public.order_documents
FOR EACH ROW EXECUTE FUNCTION public.notify_document_upload();