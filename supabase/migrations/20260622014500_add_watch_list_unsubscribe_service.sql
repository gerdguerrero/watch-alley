-- Add a service-role unsubscribe helper so public email links do not write
-- directly to the private watch_alley schema through PostgREST.

create or replace function public.service_unsubscribe_watch_list_subscriber(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  updated_id uuid;
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  normalized_email := lower(trim(coalesce(p_email, '')));
  if normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(normalized_email) > 254 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;

  update watch_alley.watch_list_subscribers
  set status = 'unsubscribed',
      updated_at = now()
  where email = normalized_email
  returning id into updated_id;

  return jsonb_build_object(
    'email', normalized_email,
    'found', updated_id is not null,
    'subscriberId', updated_id
  );
end;
$$;

revoke all on function public.service_unsubscribe_watch_list_subscriber(text)
  from public, anon, authenticated;
grant execute on function public.service_unsubscribe_watch_list_subscriber(text)
  to service_role;
