alter table public.service_offers
  add column if not exists icon text,
  add column if not exists badge_color text,
  add column if not exists display_order integer not null default 0;

create index if not exists service_offers_display_order_idx on public.service_offers (display_order);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_ar text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.destinations to anon, authenticated;
grant insert, update, delete on public.destinations to authenticated;
grant all on public.destinations to service_role;

alter table public.destinations enable row level security;

drop policy if exists "destinations_read" on public.destinations;
create policy "destinations_read" on public.destinations
  for select to anon, authenticated using (is_active or public.is_staff(auth.uid()));

drop policy if exists "destinations_admin_write" on public.destinations;
create policy "destinations_admin_write" on public.destinations
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop trigger if exists destinations_set_updated_at on public.destinations;
create trigger destinations_set_updated_at before update on public.destinations
  for each row execute function public.set_updated_at();

insert into public.destinations (code, name_en, name_ar, display_order) values
  ('EG', 'Egypt', 'مصر', 1),
  ('SA', 'Saudi Arabia', 'السعودية', 2),
  ('AE', 'United Arab Emirates', 'الإمارات', 3),
  ('TR', 'Türkiye', 'تركيا', 4),
  ('QA', 'Qatar', 'قطر', 5),
  ('KW', 'Kuwait', 'الكويت', 6),
  ('JO', 'Jordan', 'الأردن', 7),
  ('SD', 'Sudan', 'السودان', 8),
  ('ET', 'Ethiopia', 'إثيوبيا', 9),
  ('KE', 'Kenya', 'كينيا', 10),
  ('MY', 'Malaysia', 'ماليزيا', 11),
  ('GB', 'United Kingdom', 'المملكة المتحدة', 12)
on conflict (code) do nothing;