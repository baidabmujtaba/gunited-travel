revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.next_tracking_id() from anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.is_staff(uuid) from anon;
revoke execute on function public.is_admin(uuid) from anon;

create or replace function public.assign_tracking_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tracking_id is null or new.tracking_id = '' then
    new.tracking_id := 'GT-ORD-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.order_seq')::text, 6, '0');
  end if;
  return new;
end $$;
revoke execute on function public.assign_tracking_id() from anon, authenticated;

alter table public.service_orders alter column tracking_id drop not null;
create trigger orders_tracking_id before insert on public.service_orders
  for each row execute function public.assign_tracking_id();