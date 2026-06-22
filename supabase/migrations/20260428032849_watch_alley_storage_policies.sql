-- Storage policies for the 'watches' bucket.
-- Public can READ. Only admins (allowlisted via watch_alley.is_admin)
-- can INSERT/UPDATE/DELETE.

-- Drop any prior versions of these named policies (idempotent re-run safe).
drop policy if exists "Watches: public read" on storage.objects;
drop policy if exists "Watches: admin insert" on storage.objects;
drop policy if exists "Watches: admin update" on storage.objects;
drop policy if exists "Watches: admin delete" on storage.objects;

create policy "Watches: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'watches');

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
  using (bucket_id = 'watches' and watch_alley.is_admin());;
