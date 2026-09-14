-- Swagattam Event Estimate Studio — rls.sql
-- Run this second, after schema.sql.

alter table public.catalog enable row level security;
alter table public.quotes enable row level security;

-- Everyone (anonymous + authenticated) can read the catalog.
drop policy if exists "Public can read catalog" on public.catalog;
create policy "Public can read catalog"
  on public.catalog
  for select
  to anon, authenticated
  using (true);

-- Only users whose JWT has app_metadata.role = 'admin' can add/update the catalog row.
drop policy if exists "Admins can insert catalog" on public.catalog;
create policy "Admins can insert catalog"
  on public.catalog
  for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update catalog" on public.catalog;
create policy "Admins can update catalog"
  on public.catalog
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Anyone (including anonymous customers) can submit a quote.
drop policy if exists "Public can submit quotes" on public.quotes;
create policy "Public can submit quotes"
  on public.quotes
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can read saved quotes (protects customer data).
drop policy if exists "Admins can read quotes" on public.quotes;
create policy "Admins can read quotes"
  on public.quotes
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
