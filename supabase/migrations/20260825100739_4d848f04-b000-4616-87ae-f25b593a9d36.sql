CREATE TABLE public.integration_credentials (
  key text PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_id text,
  client_secret text,
  environment text NOT NULL DEFAULT 'test',
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_credentials TO authenticated;
GRANT ALL ON public.integration_credentials TO service_role;

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_credentials_admin_all"
  ON public.integration_credentials
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER integration_credentials_updated_at
  BEFORE UPDATE ON public.integration_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();