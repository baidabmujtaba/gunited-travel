ALTER TABLE public.service_offers
  ADD COLUMN IF NOT EXISTS customer_price_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_price_usd numeric;

UPDATE public.service_offers SET customer_price_usd = base_price_usd
WHERE customer_price_usd = 0 AND base_price_usd > 0;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS applied_price_usd numeric,
  ADD COLUMN IF NOT EXISTS price_context text;

ALTER TABLE public.service_orders
  DROP CONSTRAINT IF EXISTS service_orders_price_context_check;
ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_price_context_check
  CHECK (price_context IS NULL OR price_context IN ('customer','agency'));

UPDATE public.service_orders
SET applied_price_usd = amount_usd,
    price_context = CASE WHEN agency_id IS NOT NULL THEN 'agency' ELSE 'customer' END
WHERE applied_price_usd IS NULL;

-- Column-level isolation: anonymous storefront reads can never include the agency price.
REVOKE SELECT ON public.service_offers FROM anon;
GRANT SELECT (
  id, slug, title_en, title_ar, description_en, description_ar, category,
  base_price_usd, customer_price_usd, duration_en, duration_ar, status, expiry_date,
  features, images, primary_image, tax_percent, fee_amount_usd, discount_percent,
  commission_percent, deleted_at, created_by, created_at, updated_at,
  allowed_payment_methods, required_documents
) ON public.service_offers TO anon;