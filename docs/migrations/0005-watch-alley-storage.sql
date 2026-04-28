-- Watch Alley storage bucket for admin-uploaded inventory images (2026-04-28).
-- Public read via direct bucket URL (bucket is public=true).
-- Authenticated admins (is_admin allowlist) can insert/update/delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('watches', 'watches', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No broad SELECT policy on storage.objects — public bucket already exposes
-- direct file URLs without it, and adding a SELECT policy would let any
-- client list every file in the bucket via the API.

drop policy if exists "Watches: admin insert" on storage.objects;
drop policy if exists "Watches: admin update" on storage.objects;
drop policy if exists "Watches: admin delete" on storage.objects;

create policy "Watches: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'watches' and watch_alley.is_admin());

create policy "Watches: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'watches' and watch_alley.is_admin())
  with check (bucket_id = 'watches' and watch_alley.is_admin());

create policy "Watches: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'watches' and watch_alley.is_admin());
