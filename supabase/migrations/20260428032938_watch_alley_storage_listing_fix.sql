-- The 'watches' bucket is set as public=true, which means individual file URLs
-- are accessible without any RLS policy. The earlier broad SELECT policy was
-- redundant and allowed CLIENTS to LIST every file in the bucket via the API.
-- Drop it; public URL access still works.

drop policy if exists "Watches: public read" on storage.objects;;
