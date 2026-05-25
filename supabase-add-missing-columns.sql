-- Privilege Imoveis - adicionar colunas faltantes
-- Rode este arquivo se o erro foi em "add column if not exists ...".

alter table public.properties add column if not exists updated_at timestamptz not null default now();
alter table public.properties add column if not exists owner_id uuid references auth.users(id) on delete set null default auth.uid();
alter table public.properties add column if not exists broker_id uuid references auth.users(id) on delete set null;
alter table public.properties add column if not exists latitude double precision;
alter table public.properties add column if not exists longitude double precision;
alter table public.properties add column if not exists type text;
alter table public.properties add column if not exists status text not null default 'ativo';
alter table public.properties add column if not exists condominium text;
alter table public.properties add column if not exists iptu text;
alter table public.properties add column if not exists videos text[] not null default '{}';
alter table public.properties add column if not exists virtual_tour_url text;
alter table public.properties add column if not exists meta_title text;
alter table public.properties add column if not exists meta_description text;
alter table public.properties add column if not exists keywords text[] not null default '{}';
alter table public.properties add column if not exists og_image text;
alter table public.properties add column if not exists whatsapp text;
alter table public.properties add column if not exists external_url text;

alter table public.leads add column if not exists updated_at timestamptz not null default now();
alter table public.leads add column if not exists broker_id uuid references auth.users(id) on delete set null;
alter table public.leads add column if not exists notes text;
