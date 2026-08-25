CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  nationality text,
  city text,
  notes text DEFAULT ''::text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_staff_all ON public.customers FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX customers_email_idx ON public.customers (lower(email));

CREATE TABLE public.travel_agencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name text NOT NULL,
  license_number text,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  city text,
  notes text DEFAULT ''::text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_agencies TO authenticated;
GRANT ALL ON public.travel_agencies TO service_role;
ALTER TABLE public.travel_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY agencies_staff_all ON public.travel_agencies FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE TRIGGER travel_agencies_updated_at BEFORE UPDATE ON public.travel_agencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX travel_agencies_email_idx ON public.travel_agencies (lower(email));