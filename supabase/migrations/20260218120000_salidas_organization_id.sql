-- Aislar salidas por cuenta (mismo organization_id que en profiles).
-- Filas antiguas sin organization_id no aparecerán en la app hasta backfill manual si aplica.

alter table public.salidas
  add column if not exists organization_id uuid;

create index if not exists salidas_organization_id_idx
  on public.salidas (organization_id);
