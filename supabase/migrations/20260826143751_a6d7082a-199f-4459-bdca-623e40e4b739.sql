CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.user_roles where user_id = _user_id
    and role in ('super_admin','admin','accountant'))
$function$;