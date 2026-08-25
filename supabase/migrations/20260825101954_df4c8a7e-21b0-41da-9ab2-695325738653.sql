CREATE TABLE public.flight_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amadeus_order_id text NOT NULL UNIQUE,
  reference text,
  environment text NOT NULL DEFAULT 'test',
  status text NOT NULL DEFAULT 'confirmed',
  origin text,
  destination text,
  departure_date date,
  return_date date,
  travelers jsonb NOT NULL DEFAULT '[]'::jsonb,
  itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD',
  customer_email text,
  raw_order jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_bookings TO authenticated;
GRANT ALL ON public.flight_bookings TO service_role;

ALTER TABLE public.flight_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage flight bookings"
  ON public.flight_bookings FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER flight_bookings_updated_at
  BEFORE UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX flight_bookings_created_at_idx ON public.flight_bookings (created_at DESC);