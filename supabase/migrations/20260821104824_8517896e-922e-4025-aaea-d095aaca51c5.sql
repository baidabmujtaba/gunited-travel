-- ============ roles ============
create type public.app_role as enum ('super_admin','admin','booking_agent','accountant','client');
create type public.offer_status as enum ('active','draft','archived');
create type public.order_status as enum ('submitted','payment_pending','payment_confirmed','processing','completed','cancelled','rejected');

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  whatsapp text,
  nationality text,
  passport_number text,
  passport_expiry date,
  preferred_language text not null default 'ar',
  is_agency boolean not null default false,
  discount_tier numeric(5,2) not null default 0,
  must_change_password boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id
    and role in ('super_admin','admin','booking_agent','accountant'))
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id
    and role in ('super_admin','admin'))
$$;

create policy "profiles_self_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles_self_insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

create policy "user_roles_read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- new users get a profile + client role; the two owner emails become super admins
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, whatsapp, must_change_password)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'whatsapp',''),
    lower(new.email) in ('gunitedtravel@gmail.com','mujtababaidab@gmail.com'))
  on conflict (id) do nothing;

  if lower(new.email) in ('gunitedtravel@gmail.com','mujtababaidab@gmail.com') then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin')
      on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'client')
      on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ currencies ============
create table public.currencies (
  code text primary key,
  name_en text not null,
  name_ar text not null,
  symbol text not null,
  decimals int not null default 2,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.currencies to anon, authenticated;
grant all on public.currencies to service_role;
alter table public.currencies enable row level security;
create policy "currencies_public_read" on public.currencies for select to anon, authenticated using (true);
create policy "currencies_admin_write" on public.currencies for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null references public.currencies(code) on delete cascade,
  rate_per_usd numeric(18,6) not null check (rate_per_usd > 0),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (currency_code)
);
grant select on public.exchange_rates to anon, authenticated;
grant all on public.exchange_rates to service_role;
alter table public.exchange_rates enable row level security;
create policy "rates_public_read" on public.exchange_rates for select to anon, authenticated using (true);
create policy "rates_admin_write" on public.exchange_rates for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create trigger rates_updated_at before update on public.exchange_rates
  for each row execute function public.set_updated_at();

insert into public.currencies (code, name_en, name_ar, symbol, decimals) values
  ('USD','US Dollar','دولار أمريكي','$',2),
  ('SDG','Sudanese Pound','جنيه سوداني','ج.س',0),
  ('SAR','Saudi Riyal','ريال سعودي','ر.س',2),
  ('AED','UAE Dirham','درهم إماراتي','د.إ',2);
insert into public.exchange_rates (currency_code, rate_per_usd) values
  ('USD',1),('SDG',2400),('SAR',3.75),('AED',3.6725);

-- ============ offers ============
create table public.service_offers (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title_en text not null,
  title_ar text not null,
  description_en text default '',
  description_ar text default '',
  category text not null default 'package',
  base_price_usd numeric(14,2) not null check (base_price_usd >= 0),
  duration_en text,
  duration_ar text,
  status public.offer_status not null default 'draft',
  expiry_date date,
  features jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  primary_image text,
  tax_percent numeric(6,2) not null default 0,
  fee_amount_usd numeric(14,2) not null default 0,
  discount_percent numeric(6,2) not null default 0,
  commission_percent numeric(6,2) not null default 0,
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.service_offers to anon;
grant select, insert, update, delete on public.service_offers to authenticated;
grant all on public.service_offers to service_role;
alter table public.service_offers enable row level security;
create policy "offers_public_read_active" on public.service_offers for select to anon, authenticated
  using (status = 'active' and deleted_at is null and (expiry_date is null or expiry_date >= current_date));
create policy "offers_staff_read" on public.service_offers for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "offers_staff_write" on public.service_offers for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create index service_offers_status_idx on public.service_offers (status, category);
create trigger offers_updated_at before update on public.service_offers
  for each row execute function public.set_updated_at();

-- ============ payment methods ============
create table public.payment_method_configs (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  account_holder text,
  account_number text,
  iban text,
  branch text,
  qr_image_url text,
  instructions_en text,
  instructions_ar text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.payment_method_configs to anon, authenticated;
grant insert, update, delete on public.payment_method_configs to authenticated;
grant all on public.payment_method_configs to service_role;
alter table public.payment_method_configs enable row level security;
create policy "pm_public_read" on public.payment_method_configs for select to anon, authenticated
  using (is_active = true);
create policy "pm_admin_all" on public.payment_method_configs for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create trigger pm_updated_at before update on public.payment_method_configs
  for each row execute function public.set_updated_at();

insert into public.payment_method_configs (name_en, name_ar, account_holder, account_number, branch, instructions_en, instructions_ar, sort_order) values
 ('Bank of Khartoum','بنك الخرطوم','Gunited Travel','2810123456789','Khartoum 2','Transfer the exact total then upload the receipt.','حوّل المبلغ بالكامل ثم قم برفع الإيصال.',1),
 ('Bankak','بنكك','Gunited Travel','0912345678','—','Send via Bankak app and attach the confirmation screenshot.','أرسل عبر تطبيق بنكك وأرفق صورة التأكيد.',2);

-- ============ orders ============
create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique,
  offer_id uuid references public.service_offers(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  whatsapp text not null,
  currency_code text not null default 'USD' references public.currencies(code),
  frozen_rate numeric(18,6) not null default 1,
  amount_usd numeric(14,2) not null default 0,
  amount_display numeric(18,2) not null default 0,
  payment_method_id uuid references public.payment_method_configs(id) on delete set null,
  transaction_reference text,
  receipt_path text,
  status public.order_status not null default 'submitted',
  document_status text default 'awaiting_documents',
  internal_notes text default '',
  assigned_to uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.service_orders to authenticated;
grant select on public.service_orders to anon;
grant all on public.service_orders to service_role;
alter table public.service_orders enable row level security;
create policy "orders_owner_read" on public.service_orders for select to authenticated
  using (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy "orders_public_track" on public.service_orders for select to anon using (true);
create policy "orders_insert" on public.service_orders for insert to authenticated
  with check (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy "orders_staff_update" on public.service_orders for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create index orders_tracking_idx on public.service_orders (tracking_id);
create index orders_customer_idx on public.service_orders (customer_id, status);
create trigger orders_updated_at before update on public.service_orders
  for each row execute function public.set_updated_at();

create sequence public.order_seq start 1;
create or replace function public.next_tracking_id() returns text
language sql volatile set search_path = public as $$
  select 'GT-ORD-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.order_seq')::text, 6, '0')
$$;

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  note text,
  actor_id uuid references auth.users(id),
  actor_name text,
  created_at timestamptz not null default now()
);
grant select, insert on public.order_status_history to authenticated;
grant select on public.order_status_history to anon;
grant all on public.order_status_history to service_role;
alter table public.order_status_history enable row level security;
create policy "osh_read" on public.order_status_history for select to anon, authenticated using (true);
create policy "osh_insert" on public.order_status_history for insert to authenticated
  with check (public.is_staff(auth.uid()) or exists (
    select 1 from public.service_orders o where o.id = order_id and o.customer_id = auth.uid()));
create index osh_order_idx on public.order_status_history (order_id, created_at);

-- ============ invoices ============
create sequence public.invoice_seq start 1;
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid references public.service_orders(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  currency_code text not null default 'USD',
  frozen_rate numeric(18,6) not null default 1,
  subtotal_usd numeric(14,2) not null default 0,
  tax_usd numeric(14,2) not null default 0,
  discount_usd numeric(14,2) not null default 0,
  total_usd numeric(14,2) not null default 0,
  total_display numeric(18,2) not null default 0,
  paid_usd numeric(14,2) not null default 0,
  status text not null default 'issued',
  email_sent_at timestamptz,
  email_error text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "invoices_read" on public.invoices for select to authenticated
  using (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy "invoices_staff_write" on public.invoices for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- ============ notifications ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audience text not null default 'user',
  title_en text not null,
  title_ar text not null,
  body_en text,
  body_ar text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif_read" on public.notifications for select to authenticated
  using (user_id = auth.uid() or (audience = 'staff' and public.is_staff(auth.uid())));
create policy "notif_insert" on public.notifications for insert to authenticated with check (true);
create policy "notif_update" on public.notifications for update to authenticated
  using (user_id = auth.uid() or (audience = 'staff' and public.is_staff(auth.uid())))
  with check (user_id = auth.uid() or (audience = 'staff' and public.is_staff(auth.uid())));

alter publication supabase_realtime add table public.service_offers;
alter publication supabase_realtime add table public.service_orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.exchange_rates;

-- ============ audit + settings ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text,
  action text not null,
  entity text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit_staff_read" on public.audit_logs for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "audit_insert" on public.audit_logs for insert to authenticated with check (true);

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "settings_read" on public.settings for select to anon, authenticated using (true);
create policy "settings_admin_write" on public.settings for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.settings (key, value) values
 ('company', '{"name_en":"Gunited Travel","name_ar":"جيونايتد ترافيل","email":"gunitedtravel@gmail.com","whatsapp":"249912345678"}'::jsonb),
 ('stale_order_hours', '{"hours":24}'::jsonb);

-- seed a few offers so the storefront has real content
insert into public.service_offers (slug,title_en,title_ar,description_en,description_ar,category,base_price_usd,duration_en,duration_ar,status,features,primary_image)
values
 ('umrah-premium','Premium Umrah Package','باقة العمرة المميزة','Five-star Umrah package including visa, flights, hotel near the Haram and ground transport.','باقة عمرة خمس نجوم تشمل التأشيرة والطيران وفندق قريب من الحرم والنقل الداخلي.','package',1450,'10 days','10 أيام','active','["Visa processing","4-star hotel","Airport transfers","Guided ziyarah"]'::jsonb,null),
 ('uae-tourist-visa','UAE Tourist Visa (30 days)','تأشيرة الإمارات السياحية (30 يوم)','Fast-track 30-day UAE tourist visa processing with document review.','إنجاز سريع لتأشيرة الإمارات السياحية لمدة 30 يوماً مع مراجعة المستندات.','visa',180,'3-5 working days','3-5 أيام عمل','active','["Document review","Fast processing","Status tracking"]'::jsonb,null),
 ('istanbul-getaway','Istanbul Getaway','رحلة إسطنبول','Four nights in Istanbul with flights, hotel and Bosphorus tour.','أربع ليالٍ في إسطنبول تشمل الطيران والفندق ورحلة البوسفور.','tour',890,'5 days','5 أيام','active','["Return flights","City tour","Bosphorus cruise"]'::jsonb,null),
 ('travel-insurance','Schengen Travel Insurance','تأمين السفر لشنغن','Schengen-compliant travel medical insurance certificate issued same day.','شهادة تأمين طبي للسفر مطابقة لشروط شنغن تصدر في نفس اليوم.','insurance',45,'Same day','نفس اليوم','active','["Schengen compliant","Same-day issue"]'::jsonb,null);