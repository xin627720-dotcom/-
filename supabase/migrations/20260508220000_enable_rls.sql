-- Lock down all tables: enable RLS without any policies = default deny for all
-- non-service-role connections. The app uses SUPABASE_SERVICE_ROLE_KEY on the
-- server, which bypasses RLS by design. The anon key (which ships in the
-- client bundle via NEXT_PUBLIC_SUPABASE_ANON_KEY) can no longer read or
-- mutate data through the REST API.
--
-- If you later want to allow public client-side reads of certain tables
-- (e.g. canonical_products), add an explicit policy such as:
--   create policy "public read" on canonical_products
--   for select to anon using (true);

alter table canonical_products enable row level security;
alter table sources enable row level security;
alter table raw_offers enable row level security;
alter table offer_matches enable row level security;
alter table crawl_runs enable row level security;
