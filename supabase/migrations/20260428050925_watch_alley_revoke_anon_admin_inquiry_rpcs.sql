-- Tighten admin inquiry RPC privileges.
-- These functions already gate internally with watch_alley.is_admin(),
-- so anon callers receive 401. However their EXECUTE ACL still explicitly
-- included anon, which is unnecessary and triggers Supabase advisor warnings.

revoke execute on function public.admin_list_inquiries(text, int, int) from anon;
revoke execute on function public.admin_update_inquiry_status(uuid, text, text) from anon;
revoke execute on function public.admin_inquiry_metrics() from anon;

notify pgrst, 'reload schema';;
