create or replace function public.dispatch_email_queue()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  tok text;
begin
  select value->>'token' into tok from public.settings where key = 'email_dispatch';
  if tok is null then return; end if;
  if not exists (select 1 from public.email_queue where status = 'pending' and next_attempt_at <= now()) then
    return;
  end if;
  perform net.http_post(
    url := 'https://project--5c4bd00d-5303-4eb4-96c6-a18ead850b08-dev.lovable.app/api/public/email-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || tok),
    body := '{}'::jsonb
  );
end
$function$;