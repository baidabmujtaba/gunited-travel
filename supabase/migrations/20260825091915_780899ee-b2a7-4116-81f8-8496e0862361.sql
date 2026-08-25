REVOKE ALL ON FUNCTION public.assign_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;