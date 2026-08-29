ALTER TABLE public.service_offers
  ADD COLUMN IF NOT EXISTS security_subtype text,
  ADD COLUMN IF NOT EXISTS border_point text;

CREATE INDEX IF NOT EXISTS service_offers_security_idx
  ON public.service_offers (security_subtype, border_point);

INSERT INTO public.service_offers
  (slug, title_en, title_ar, description_en, description_ar, category, security_subtype, border_point,
   status, base_price_usd, customer_price_usd, agency_price_usd, required_documents, features, images)
VALUES
  ('security-approval-flight',
   'Security Approval — Flight', 'الموافقة الأمنية — طيران',
   'Security clearance request for air travel. Attach your flight ticket if already issued.',
   'طلب موافقة أمنية للسفر جواً. أرفق تذكرة الطيران إن كانت صادرة.',
   'security_approval', 'flight', NULL, 'active', 0, 0, 0,
   '[{"key":"flight_ticket","label_en":"Flight ticket (if available)","label_ar":"تذكرة الطيران (إن وجدت)","required":false}]'::jsonb,
   '[]'::jsonb, '[]'::jsonb),
  ('security-approval-border-argeen',
   'Security Approval — Argeen Crossing', 'الموافقة الأمنية — معبر أرقين',
   'Security clearance request for travel through the Argeen border crossing.',
   'طلب موافقة أمنية للسفر عبر معبر أرقين.',
   'security_approval', 'border', 'argeen', 'active', 0, 0, 0,
   '[{"key":"passport","label_en":"Passport copy","label_ar":"صورة جواز السفر","required":true},{"key":"transport_proof","label_en":"Transport proof (if available)","label_ar":"إثبات وسيلة النقل (إن وجد)","required":false}]'::jsonb,
   '[]'::jsonb, '[]'::jsonb),
  ('security-approval-border-halfa',
   'Security Approval — Halfa Crossing', 'الموافقة الأمنية — معبر حلفا',
   'Security clearance request for travel through the Halfa border crossing.',
   'طلب موافقة أمنية للسفر عبر معبر حلفا.',
   'security_approval', 'border', 'halfa', 'active', 0, 0, 0,
   '[{"key":"passport","label_en":"Passport copy","label_ar":"صورة جواز السفر","required":true},{"key":"transport_proof","label_en":"Transport proof (if available)","label_ar":"إثبات وسيلة النقل (إن وجد)","required":false}]'::jsonb,
   '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (slug) DO NOTHING;