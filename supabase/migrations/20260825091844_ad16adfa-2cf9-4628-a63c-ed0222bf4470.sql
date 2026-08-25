-- Invoice numbering
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;
REVOKE ALL ON SEQUENCE public.invoice_seq FROM PUBLIC;
GRANT USAGE ON SEQUENCE public.invoice_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT 'GT-INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
$$;
REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF new.invoice_number IS NULL OR new.invoice_number = '' THEN
    new.invoice_number := public.next_invoice_number();
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.assign_invoice_number() FROM PUBLIC;

DROP TRIGGER IF EXISTS invoices_number ON public.invoices;
CREATE TRIGGER invoices_number BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- New invoice columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_method_configs(id);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_key ON public.invoices (invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_order_id_key ON public.invoices (order_id) WHERE order_id IS NOT NULL;

-- Customers can read their own invoices by email as well as by id
DROP POLICY IF EXISTS invoices_read ON public.invoices;
CREATE POLICY invoices_read ON public.invoices FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR is_staff(auth.uid())
  OR customer_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- Realtime for the central pricing data source
ALTER TABLE public.exchange_rates REPLICA IDENTITY FULL;
ALTER TABLE public.currencies REPLICA IDENTITY FULL;
ALTER TABLE public.payment_method_configs REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.exchange_rates; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.currencies; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_method_configs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;