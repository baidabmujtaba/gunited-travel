CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
  customer_id uuid,
  agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL,
  status_change_event_id uuid,
  notification_type text NOT NULL,
  template text NOT NULL,
  previous_status text,
  new_status text,
  recipient text NOT NULL,
  language text NOT NULL DEFAULT 'ar',
  subject text NOT NULL,
  html text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_queue_status_check CHECK (status IN ('pending','processing','sent','failed'))
);

GRANT ALL ON public.email_queue TO service_role;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view email queue" ON public.email_queue
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX email_queue_due_idx ON public.email_queue (status, next_attempt_at);

CREATE TRIGGER email_queue_updated_at BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
  customer_id uuid,
  agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE SET NULL,
  status_change_event_id uuid,
  recipient text,
  notification_type text NOT NULL,
  previous_status text,
  new_status text,
  template text,
  resend_message_id text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_logs_status_check CHECK (status IN ('sent','pending','failed','not_sent'))
);

GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view email logs" ON public.email_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX email_logs_order_idx ON public.email_logs (order_id, created_at DESC);

CREATE TRIGGER email_logs_updated_at BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (key, value)
VALUES ('email_dispatch', jsonb_build_object('token', gen_random_uuid()::text, 'enabled', true))
ON CONFLICT (key) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dispatch_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tok text;
BEGIN
  SELECT value->>'token' INTO tok FROM public.settings WHERE key = 'email_dispatch';
  IF tok IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.email_queue WHERE status = 'pending' AND next_attempt_at <= now()) THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://gunited-travel.lovable.app/api/public/email-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || tok),
    body := '{}'::jsonb
  );
END $$;

REVOKE ALL ON FUNCTION public.dispatch_email_queue() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('gunited-email-dispatch', '* * * * *', $$SELECT public.dispatch_email_queue();$$);