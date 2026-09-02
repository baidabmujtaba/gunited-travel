-- ============ enum extension ============
ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'scheduled';

-- ============ categories ============
CREATE TABLE public.offer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  icon text,
  image text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_categories TO authenticated;
GRANT ALL ON public.offer_categories TO service_role;
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.offer_categories
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "categories staff write" ON public.offer_categories
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_categories_updated_at BEFORE UPDATE ON public.offer_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ badges ============
CREATE TABLE public.offer_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  color text NOT NULL DEFAULT '#0f5132',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_badges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_badges TO authenticated;
GRANT ALL ON public.offer_badges TO service_role;
ALTER TABLE public.offer_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges public read" ON public.offer_badges
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "badges staff write" ON public.offer_badges
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_badges_updated_at BEFORE UPDATE ON public.offer_badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ service_offers extensions ============
ALTER TABLE public.service_offers
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.offer_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS badge_id uuid REFERENCES public.offer_badges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'tourism_package',
  ADD COLUMN IF NOT EXISTS short_description_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_description_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_display_mode text NOT NULL DEFAULT 'starting_from',
  ADD COLUMN IF NOT EXISTS original_price_usd numeric,
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS total_days integer,
  ADD COLUMN IF NOT EXISTS makkah_nights integer,
  ADD COLUMN IF NOT EXISTS madinah_nights integer,
  ADD COLUMN IF NOT EXISTS other_nights integer,
  ADD COLUMN IF NOT EXISTS other_destination text,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS important_info_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS important_info_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terms_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terms_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS service_offers_status_idx ON public.service_offers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS service_offers_category_idx ON public.service_offers (category_id);
CREATE INDEX IF NOT EXISTS service_offers_featured_idx ON public.service_offers (is_featured, featured_order);

-- ============ visibility helper ============
CREATE OR REPLACE FUNCTION public.offer_is_public(_offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_offers o
    WHERE o.id = _offer_id
      AND o.status = 'active'
      AND o.deleted_at IS NULL
      AND (o.expiry_date IS NULL OR o.expiry_date >= current_date)
      AND (o.publish_at IS NULL OR o.publish_at <= now())
  )
$$;

-- ============ room types ============
CREATE TABLE public.offer_room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  occupancy integer NOT NULL DEFAULT 2,
  price numeric NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD',
  available_rooms integer NOT NULL DEFAULT 0,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_room_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_room_types TO authenticated;
GRANT ALL ON public.offer_room_types TO service_role;
ALTER TABLE public.offer_room_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms public read" ON public.offer_room_types
  FOR SELECT TO anon, authenticated
  USING (public.offer_is_public(offer_id) OR public.is_staff(auth.uid()));
CREATE POLICY "rooms staff write" ON public.offer_room_types
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_room_types_updated_at BEFORE UPDATE ON public.offer_room_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX offer_room_types_offer_idx ON public.offer_room_types (offer_id, sort_order);

-- ============ hotels ============
CREATE TABLE public.offer_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  city_ar text NOT NULL DEFAULT '',
  city_en text NOT NULL DEFAULT '',
  name_ar text NOT NULL,
  name_en text NOT NULL,
  stars integer NOT NULL DEFAULT 5,
  distance_haram_m integer,
  distance_mosque_m integer,
  room_type text,
  image text,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  check_in text,
  check_out text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_hotels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_hotels TO authenticated;
GRANT ALL ON public.offer_hotels TO service_role;
ALTER TABLE public.offer_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hotels public read" ON public.offer_hotels
  FOR SELECT TO anon, authenticated
  USING (public.offer_is_public(offer_id) OR public.is_staff(auth.uid()));
CREATE POLICY "hotels staff write" ON public.offer_hotels
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_hotels_updated_at BEFORE UPDATE ON public.offer_hotels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX offer_hotels_offer_idx ON public.offer_hotels (offer_id, sort_order);

-- ============ services (included / excluded) ============
CREATE TABLE public.offer_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  icon text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  is_included boolean NOT NULL DEFAULT true,
  extra_price_usd numeric NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_services TO authenticated;
GRANT ALL ON public.offer_services TO service_role;
ALTER TABLE public.offer_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer services public read" ON public.offer_services
  FOR SELECT TO anon, authenticated
  USING (public.offer_is_public(offer_id) OR public.is_staff(auth.uid()));
CREATE POLICY "offer services staff write" ON public.offer_services
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_services_updated_at BEFORE UPDATE ON public.offer_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX offer_services_offer_idx ON public.offer_services (offer_id, sort_order);

-- ============ departures ============
CREATE TABLE public.offer_departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  departure_date date NOT NULL,
  return_date date,
  seats_total integer NOT NULL DEFAULT 0,
  seats_taken integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, departure_date)
);
GRANT SELECT ON public.offer_departures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_departures TO authenticated;
GRANT ALL ON public.offer_departures TO service_role;
ALTER TABLE public.offer_departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departures public read" ON public.offer_departures
  FOR SELECT TO anon, authenticated
  USING (public.offer_is_public(offer_id) OR public.is_staff(auth.uid()));
CREATE POLICY "departures staff write" ON public.offer_departures
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_departures_updated_at BEFORE UPDATE ON public.offer_departures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ faqs ============
CREATE TABLE public.offer_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  question_ar text NOT NULL,
  question_en text NOT NULL,
  answer_ar text NOT NULL DEFAULT '',
  answer_en text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_faqs TO authenticated;
GRANT ALL ON public.offer_faqs TO service_role;
ALTER TABLE public.offer_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs public read" ON public.offer_faqs
  FOR SELECT TO anon, authenticated
  USING (public.offer_is_public(offer_id) OR public.is_staff(auth.uid()));
CREATE POLICY "faqs staff write" ON public.offer_faqs
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_faqs_updated_at BEFORE UPDATE ON public.offer_faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX offer_faqs_offer_idx ON public.offer_faqs (offer_id, sort_order);

-- ============ coupons ============
CREATE TABLE public.offer_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  starts_at date,
  ends_at date,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  min_order_usd numeric NOT NULL DEFAULT 0,
  offer_ids uuid[] NOT NULL DEFAULT '{}',
  category_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_coupons TO authenticated;
GRANT ALL ON public.offer_coupons TO service_role;
ALTER TABLE public.offer_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons staff only" ON public.offer_coupons
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER offer_coupons_updated_at BEFORE UPDATE ON public.offer_coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ analytics ============
CREATE TABLE public.offer_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  views integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  booking_requests integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, day)
);
GRANT SELECT ON public.offer_analytics TO authenticated;
GRANT ALL ON public.offer_analytics TO service_role;
ALTER TABLE public.offer_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics staff read" ON public.offer_analytics
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER offer_analytics_updated_at BEFORE UPDATE ON public.offer_analytics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.track_offer_event(_offer_id uuid, _event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.offer_is_public(_offer_id) THEN RETURN; END IF;
  INSERT INTO public.offer_analytics (offer_id, day, views, clicks, booking_requests)
  VALUES (_offer_id, current_date,
    CASE WHEN _event = 'view' THEN 1 ELSE 0 END,
    CASE WHEN _event = 'click' THEN 1 ELSE 0 END,
    CASE WHEN _event = 'booking' THEN 1 ELSE 0 END)
  ON CONFLICT (offer_id, day) DO UPDATE SET
    views = public.offer_analytics.views + CASE WHEN _event = 'view' THEN 1 ELSE 0 END,
    clicks = public.offer_analytics.clicks + CASE WHEN _event = 'click' THEN 1 ELSE 0 END,
    booking_requests = public.offer_analytics.booking_requests + CASE WHEN _event = 'booking' THEN 1 ELSE 0 END,
    updated_at = now();
  UPDATE public.service_offers SET
    view_count = view_count + CASE WHEN _event = 'view' THEN 1 ELSE 0 END,
    click_count = click_count + CASE WHEN _event = 'click' THEN 1 ELSE 0 END,
    booking_count = booking_count + CASE WHEN _event = 'booking' THEN 1 ELSE 0 END
  WHERE id = _offer_id;
END $$;
GRANT EXECUTE ON FUNCTION public.track_offer_event(uuid, text) TO anon, authenticated;

-- ============ seed categories ============
INSERT INTO public.offer_categories (slug, name_ar, name_en, display_order, is_featured) VALUES
  ('umrah-economy','عمرة اقتصادية','Economy Umrah',1,true),
  ('umrah-premium','عمرة مميزة','Premium Umrah',2,true),
  ('umrah-vip','عمرة VIP','VIP Umrah',3,true),
  ('umrah-custom','عمرة حسب الطلب','Custom Umrah',4,true),
  ('program-economy','البرنامج الاقتصادي','Economy Program',5,false),
  ('program-3-4-star','برنامج 3 و4 نجوم','3 & 4 Star Program',6,false),
  ('program-5-star','برنامج 5 نجوم','5 Star Program',7,false),
  ('visa-only','تأشيرة فقط','Visa Only',8,true),
  ('special-offers','عروض خاصة','Special Offers',9,false),
  ('ramadan-offers','عروض رمضان','Ramadan Offers',10,false),
  ('seasonal-offers','عروض موسمية','Seasonal Offers',11,false),
  ('corporate-offers','عروض الشركات','Corporate Offers',12,false),
  ('group-offers','عروض المجموعات','Group Offers',13,false),
  ('hotels','فنادق','Hotels',14,false),
  ('flight-tickets','تذاكر طيران','Flight Tickets',15,false),
  ('travel-packages','باقات سفر','Travel Packages',16,false),
  ('transport-services','خدمات النقل','Transport Services',17,false),
  ('visa-services','خدمات التأشيرات','Visa Services',18,false)
ON CONFLICT (slug) DO NOTHING;

-- ============ seed badges ============
INSERT INTO public.offer_badges (slug, label_ar, label_en, color, display_order) VALUES
  ('economy','اقتصادي','Economy','#2f6f4e',1),
  ('premium','مميز','Premium','#c9a227',2),
  ('vip','VIP','VIP','#0f3d2e',3),
  ('most-requested','الأكثر طلباً','Most requested','#b45309',4),
  ('special','عرض خاص','Special offer','#9d174d',5),
  ('new','جديد','New','#0369a1',6),
  ('limited','محدود','Limited','#b91c1c',7)
ON CONFLICT (slug) DO NOTHING;