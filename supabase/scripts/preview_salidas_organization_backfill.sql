-- Preview ONLY: `salidas` con organization_id IS NULL.
-- Sin UPDATE ni DELETE.
--
-- SECCIÓN A — Igual que entradas: inferencia por user_id / creado_por → profiles.organization_id.
-- Requiere columnas `user_id` y `creado_por` en `public.salidas`. Si no existen, Postgres marcará error:
-- usar la sección B (inferencia por inventario), típica para datos legacy sin usuario en la fila.
--
-- SECCIÓN B — Inferencia cruzada con inventario (mismo producto normalizado + origen).

-- -----------------------------------------------------------------------------
-- 0) (Opcional) Columnas actuales de salidas
-- -----------------------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'salidas'
order by ordinal_position;

-- -----------------------------------------------------------------------------
-- A1) Conteo de filas huérfanas en salidas
-- -----------------------------------------------------------------------------
select count(*)::bigint as filas_salidas_org_null
from public.salidas
where organization_id is null;

-- -----------------------------------------------------------------------------
-- A2) Detalle por fila — perfiles (solo organization_id IS NULL en salidas)
-- -----------------------------------------------------------------------------
with src as (
  select
    s.id as salida_id,
    s.user_id,
    s.creado_por,
    pu.organization_id as org_desde_user_id,
    pc.organization_id as org_desde_creado_por
  from public.salidas s
  left join public.profiles pu on pu.id is not distinct from s.user_id
  left join public.profiles pc on pc.id is not distinct from s.creado_por
  where s.organization_id is null
)
select
  salida_id,
  user_id,
  creado_por,
  org_desde_user_id,
  org_desde_creado_por,
  case
    when org_desde_user_id is not null
      and org_desde_creado_por is not null
      and org_desde_user_id is distinct from org_desde_creado_por
      then 'conflicto_user_vs_creado_por'
    when org_desde_user_id is not null
      then 'recuperable_por_user_id'
    when org_desde_creado_por is not null
      then 'recuperable_por_creado_por'
    else 'sin_match'
  end as estado,
  case
    when org_desde_user_id is not null
      and org_desde_creado_por is not null
      and org_desde_user_id is distinct from org_desde_creado_por
      then null
    else coalesce(org_desde_user_id, org_desde_creado_por)
  end as organization_id_inferido
from src
order by estado, salida_id;

-- -----------------------------------------------------------------------------
-- A3) Resumen agregado por estado (solo perfiles; mismas reglas que arriba)
-- -----------------------------------------------------------------------------
with src as (
  select
    s.id as salida_id,
    pu.organization_id as org_desde_user_id,
    pc.organization_id as org_desde_creado_por
  from public.salidas s
  left join public.profiles pu on pu.id is not distinct from s.user_id
  left join public.profiles pc on pc.id is not distinct from s.creado_por
  where s.organization_id is null
),
tagged as (
  select
    salida_id,
    case
      when org_desde_user_id is not null
        and org_desde_creado_por is not null
        and org_desde_user_id is distinct from org_desde_creado_por
        then 'conflicto_user_vs_creado_por'
      when org_desde_user_id is not null
        then 'recuperable_por_user_id'
      when org_desde_creado_por is not null
        then 'recuperable_por_creado_por'
      else 'sin_match'
    end as estado
  from src
)
select estado, count(*)::bigint as filas
from tagged
group by estado
order by estado;

-- -----------------------------------------------------------------------------
-- B1) Detalle por fila — inferencia desde inventario (producto + origen)
-- Estados distintos a la sección A:
--   recuperable_desde_inventario — una sola organization_id distinta en inventario para el par
--   conflicto_inventario_multiples_orgs — más de una org en inventario para el mismo par
--   sin_match — ninguna fila de inventario con org para ese par
-- -----------------------------------------------------------------------------
with sal as (
  select
    s.id as salida_id,
    lower(trim(s.producto)) as producto_norm,
    s.origen
  from public.salidas s
  where s.organization_id is null
),
inv_orgs as (
  select
    lower(trim(i.producto)) as producto_norm,
    i.origen,
    count(distinct i.organization_id)::bigint as num_orgs,
    min(i.organization_id) as ejemplo_org_id
  from public.inventario i
  where i.organization_id is not null
  group by lower(trim(i.producto)), i.origen
)
select
  sal.salida_id,
  sal.producto_norm,
  sal.origen,
  io.num_orgs,
  case
    when io.num_orgs is null or io.num_orgs = 0 then 'sin_match'
    when io.num_orgs = 1 then 'recuperable_desde_inventario'
    else 'conflicto_inventario_multiples_orgs'
  end as estado,
  case
    when io.num_orgs = 1 then io.ejemplo_org_id
    else null
  end as organization_id_inferido
from sal
left join inv_orgs io
  on io.producto_norm = sal.producto_norm
 and io.origen is not distinct from sal.origen
order by estado, salida_id;

-- -----------------------------------------------------------------------------
-- B2) Resumen agregado por estado (solo inferencia inventario)
-- -----------------------------------------------------------------------------
with sal as (
  select
    s.id as salida_id,
    lower(trim(s.producto)) as producto_norm,
    s.origen
  from public.salidas s
  where s.organization_id is null
),
inv_orgs as (
  select
    lower(trim(i.producto)) as producto_norm,
    i.origen,
    count(distinct i.organization_id)::bigint as num_orgs
  from public.inventario i
  where i.organization_id is not null
  group by lower(trim(i.producto)), i.origen
),
tagged as (
  select
    sal.salida_id,
    case
      when io.num_orgs is null or io.num_orgs = 0 then 'sin_match'
      when io.num_orgs = 1 then 'recuperable_desde_inventario'
      else 'conflicto_inventario_multiples_orgs'
    end as estado
  from sal
  left join inv_orgs io
    on io.producto_norm = sal.producto_norm
   and io.origen is not distinct from sal.origen
)
select estado, count(*)::bigint as filas
from tagged
group by estado
order by estado;
