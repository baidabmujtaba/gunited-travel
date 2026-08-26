-- ============ 1. travel_agencies extensions ============
ALTER TABLE public.travel_agencies
  ADD COLUMN IF NOT EXISTS credit_limit_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warning_percent numeric NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS financial_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============ 2. agency links ============
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL;
ALTER TABLE public.customers      ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL;
ALTER TABLE public.invoices       ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_customers_agency ON public.customers(agency_id);
CREATE INDEX IF NOT EXISTS idx_orders_agency_created ON public.service_orders(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_agency ON public.invoices(agency_id);

-- ============ 3. helper functions ============
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_agency_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_agency_id() TO authenticated;

-- ============ 4. service_prices ============
CREATE TABLE IF NOT EXISTS public.service_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.service_offers(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('agency','customer')),
  price_usd numeric NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, audience)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_prices TO authenticated;
GRANT ALL ON public.service_prices TO service_role;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage service prices" ON public.service_prices
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- agency users may only read the agency row; customers only the customer row
CREATE POLICY "agency users read agency price" ON public.service_prices
  FOR SELECT TO authenticated
  USING (audience = 'agency' AND public.has_role(auth.uid(), 'travel_agency'));

CREATE POLICY "customers read customer price" ON public.service_prices
  FOR SELECT TO authenticated
  USING (audience = 'customer' AND NOT public.has_role(auth.uid(), 'travel_agency'));

CREATE TRIGGER service_prices_updated_at BEFORE UPDATE ON public.service_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 5. payments ============
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text,
  agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL,
  customer_id uuid,
  order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL DEFAULT 'USD',
  frozen_rate numeric NOT NULL DEFAULT 1,
  amount_usd numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT current_date,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_type text NOT NULL DEFAULT 'internal' CHECK (payment_type IN ('internal','external')),
  payer_name text,
  sending_institution text,
  transaction_reference text,
  receipt_number text,
  receipt_path text,
  description text,
  notes text,
  status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed')),
  reversed_by uuid,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_agency_ref
  ON public.payments(agency_id, lower(transaction_reference))
  WHERE transaction_reference IS NOT NULL AND agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_agency_created ON public.payments(agency_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage payments" ON public.payments
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "agency reads own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (agency_id IS NOT NULL AND agency_id = public.current_agency_id());

CREATE POLICY "customer reads own payments" ON public.payments
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.payment_seq;
CREATE OR REPLACE FUNCTION public.assign_payment_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF new.payment_number IS NULL OR new.payment_number = '' THEN
    new.payment_number := 'GT-PAY-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.payment_seq')::text, 6, '0');
  END IF;
  IF new.receipt_number IS NULL OR new.receipt_number = '' THEN
    new.receipt_number := replace(new.payment_number, 'GT-PAY-', 'GT-RCP-');
  END IF;
  RETURN new;
END $$;
REVOKE EXECUTE ON FUNCTION public.assign_payment_number() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER payments_number BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.assign_payment_number();

-- ============ 6. agency_ledger (append-only) ============
CREATE TABLE IF NOT EXISTS public.agency_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.travel_agencies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('opening','charge','payment','adjustment','reversal','settlement')),
  description text,
  debit numeric NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric NOT NULL DEFAULT 0 CHECK (credit >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate numeric NOT NULL DEFAULT 1,
  reference text,
  payment_method text,
  reverses_entry_id uuid REFERENCES public.agency_ledger(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_agency_created ON public.agency_ledger(agency_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_currency ON public.agency_ledger(agency_id, currency_code);

GRANT SELECT, INSERT ON public.agency_ledger TO authenticated;
GRANT ALL ON public.agency_ledger TO service_role;
ALTER TABLE public.agency_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read ledger" ON public.agency_ledger
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert ledger" ON public.agency_ledger
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "agency reads own ledger" ON public.agency_ledger
  FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());

-- ============ 7. balances ============
CREATE OR REPLACE FUNCTION public.agency_balance(_agency_id uuid, _currency text DEFAULT 'USD')
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(debit) - sum(credit), 0)
  FROM public.agency_ledger
  WHERE agency_id = _agency_id AND currency_code = _currency
$$;
REVOKE EXECUTE ON FUNCTION public.agency_balance(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_balance(uuid, text) TO authenticated;

CREATE OR REPLACE VIEW public.v_agency_balances
WITH (security_invoker = true) AS
SELECT
  l.agency_id,
  l.currency_code,
  sum(l.debit)  AS total_due,
  sum(l.credit) AS total_paid,
  sum(l.debit) - sum(l.credit) AS outstanding,
  max(l.created_at) AS last_movement_at
FROM public.agency_ledger l
GROUP BY l.agency_id, l.currency_code;

GRANT SELECT ON public.v_agency_balances TO authenticated;
GRANT ALL ON public.v_agency_balances TO service_role;