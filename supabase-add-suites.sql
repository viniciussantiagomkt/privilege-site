alter table public.properties
  add column if not exists suites integer not null default 0;
