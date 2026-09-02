ALTER TABLE public.service_offers
  ADD COLUMN IF NOT EXISTS parent_offer_id uuid REFERENCES public.service_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS input_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS input_price numeric,
  ADD COLUMN IF NOT EXISTS input_agency_price numeric,
  ADD COLUMN IF NOT EXISTS input_original_price numeric,
  ADD COLUMN IF NOT EXISTS input_rate_per_usd numeric;

CREATE INDEX IF NOT EXISTS service_offers_parent_idx ON public.service_offers(parent_offer_id);