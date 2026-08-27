-- Agencies can read their own agency profile
CREATE POLICY "agency reads own profile" ON public.travel_agencies
FOR SELECT TO authenticated
USING (id = public.current_agency_id());

-- Agencies manage only their own customers
CREATE POLICY "agency reads own customers" ON public.customers
FOR SELECT TO authenticated
USING (agency_id IS NOT NULL AND agency_id = public.current_agency_id());

CREATE POLICY "agency inserts own customers" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (agency_id IS NOT NULL AND agency_id = public.current_agency_id());

CREATE POLICY "agency updates own customers" ON public.customers
FOR UPDATE TO authenticated
USING (agency_id IS NOT NULL AND agency_id = public.current_agency_id())
WITH CHECK (agency_id IS NOT NULL AND agency_id = public.current_agency_id());

-- Agencies read only orders booked under their agency
CREATE POLICY "agency reads own orders" ON public.service_orders
FOR SELECT TO authenticated
USING (agency_id IS NOT NULL AND agency_id = public.current_agency_id());