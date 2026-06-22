create or replace function public.admin_list_watches()
returns setof watch_alley.watches
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not watch_alley.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
    select * from watch_alley.watches
    order by status asc, display_order asc;
end;
$$;
revoke all on function public.admin_list_watches() from public, anon;
grant execute on function public.admin_list_watches() to authenticated;
comment on function public.admin_list_watches() is
  'Returns every watch_alley.watches row (drafts + published). Admin-only.';;
