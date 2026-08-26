-- One agency profile may be linked to at most one user account
CREATE UNIQUE INDEX IF NOT EXISTS travel_agencies_user_id_key
  ON public.travel_agencies (user_id) WHERE user_id IS NOT NULL;

-- Role / agency targeting for notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS role public.app_role,
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.travel_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_role_idx ON public.notifications (role);
CREATE INDEX IF NOT EXISTS notifications_agency_idx ON public.notifications (agency_id);

DROP POLICY IF EXISTS notif_read ON public.notifications;
DROP POLICY IF EXISTS notif_update ON public.notifications;
DROP POLICY IF EXISTS notif_insert ON public.notifications;

CREATE POLICY notif_read ON public.notifications
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (audience = 'staff' AND public.is_staff(auth.uid()))
  OR (role IS NOT NULL AND public.has_role(auth.uid(), role))
  OR (agency_id IS NOT NULL AND agency_id = public.current_agency_id())
);

CREATE POLICY notif_update ON public.notifications
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (audience = 'staff' AND public.is_staff(auth.uid()))
  OR (role IS NOT NULL AND public.has_role(auth.uid(), role))
  OR (agency_id IS NOT NULL AND agency_id = public.current_agency_id())
)
WITH CHECK (
  user_id = auth.uid()
  OR (audience = 'staff' AND public.is_staff(auth.uid()))
  OR (role IS NOT NULL AND public.has_role(auth.uid(), role))
  OR (agency_id IS NOT NULL AND agency_id = public.current_agency_id())
);

CREATE POLICY notif_insert ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));