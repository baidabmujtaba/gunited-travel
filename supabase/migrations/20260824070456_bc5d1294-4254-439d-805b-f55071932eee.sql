create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  return new;
end $function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;