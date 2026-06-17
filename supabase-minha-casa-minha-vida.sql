alter table public.properties
  add column if not exists minha_casa_minha_vida boolean not null default false;

comment on column public.properties.minha_casa_minha_vida is
  'Indica se o imóvel se enquadra no programa Minha Casa Minha Vida.';
