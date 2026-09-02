CREATE OR REPLACE FUNCTION public.offer_is_public(_offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_offers o
    WHERE o.id = _offer_id
      AND o.status = 'active'
      AND o.deleted_at IS NULL
      AND (o.expiry_date IS NULL OR o.expiry_date >= current_date)
      AND (o.publish_at IS NULL OR o.publish_at <= now())
  )
$$;