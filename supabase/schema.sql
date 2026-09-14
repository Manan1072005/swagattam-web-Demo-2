-- Swagattam Event Estimate Studio — schema.sql
-- Run this first in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- Single-row catalog table. The app always reads/writes the row with id = 'default'.
create table if not exists public.catalog (
  id text primary key,
  categories jsonb not null,
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every write.
create or replace function public.set_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_catalog_updated_at on public.catalog;
create trigger trg_catalog_updated_at
  before update on public.catalog
  for each row
  execute function public.set_catalog_updated_at();

-- Saved customer estimates / quotes.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  mobile text not null,
  event_type text not null,
  event_date text not null,
  guests integer not null,
  customer_gst_number text,
  hall text not null,
  services jsonb not null,
  pricing jsonb not null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'confirmed', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists idx_quotes_created_at on public.quotes (created_at desc);
create index if not exists idx_quotes_reference on public.quotes (reference);
