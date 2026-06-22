-- Add column to store unsubscribe reason (feedback form)
ALTER TABLE watch_alley.watch_list_subscribers
ADD COLUMN IF NOT EXISTS unsubscribed_reason text;

-- Add check constraint for allowed reason values
ALTER TABLE watch_alley.watch_list_subscribers
ADD CONSTRAINT unsubscribed_reason_check
CHECK (
  unsubscribed_reason IS NULL OR
  unsubscribed_reason = ANY (ARRAY[
    'too-many-emails',
    'content-not-relevant',
    'never-signed-up',
    'temporary',
    'privacy-concerns',
    'other'
  ])
);

-- Update the service_unsubscribe_watch_list_subscriber function to accept reason
CREATE OR REPLACE FUNCTION public.service_unsubscribe_watch_list_subscriber(
  p_email text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
      unsubscribed_reason = p_reason,
      updated_at = now()
  where email = normalized_email
  returning id into updated_id;

  return jsonb_build_object(
    'email', normalized_email,
    'found', updated_id is not null,
    'subscriberId', updated_id
  );
end;
$function$;;
