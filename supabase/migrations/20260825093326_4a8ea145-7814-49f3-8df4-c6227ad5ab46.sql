ALTER TABLE public.service_offers
  ADD COLUMN IF NOT EXISTS allowed_payment_methods uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS required_documents jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS payment_notified_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.order_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  doc_key text NOT NULL DEFAULT '',
  label_en text NOT NULL DEFAULT '',
  label_ar text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  file_name text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_documents TO authenticated;
GRANT ALL ON public.order_documents TO service_role;

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_docs_read" ON public.order_documents
FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.service_orders o
    WHERE o.id = order_documents.order_id AND o.customer_id = auth.uid()
  )
);

CREATE POLICY "order_docs_insert" ON public.order_documents
FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.service_orders o
    WHERE o.id = order_documents.order_id AND o.customer_id = auth.uid()
  )
);

CREATE POLICY "order_docs_staff_write" ON public.order_documents
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "order_docs_staff_delete" ON public.order_documents
FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS order_documents_order_idx ON public.order_documents(order_id);

CREATE TRIGGER order_documents_updated_at
BEFORE UPDATE ON public.order_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();