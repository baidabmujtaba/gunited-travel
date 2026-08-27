DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  tok text;
BEGIN
  SELECT value->>'token' INTO tok FROM public.settings WHERE key = 'email_dispatch';
  IF tok IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.email_queue WHERE status = 'pending' AND next_attempt_at <= now()) THEN
    RETURN;
  END IF;
  PERFORM extensions.http_post(
    url := 'https://gunited-travel.lovable.app/api/public/email-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || tok),
    body := '{}'::jsonb
  );
END $$;

REVOKE ALL ON FUNCTION public.dispatch_email_queue() FROM PUBLIC, anon, authenticated;