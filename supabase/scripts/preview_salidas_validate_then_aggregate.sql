-- Solo SELECT — validación de columnas en public.salidas + conteos / resumen por estado.
-- Sin UPDATE ni DELETE.
--
-- Después del query (2): si falta user_id o creado_por → ejecutar únicamente AGREGADO B (inferencia inventario).
-- Si existen ambas columnas → puedes usar AGREGADO A (perfiles).
-- Si falta organization_id en la tabla, no ejecutes el query (3): primero crea/alinea esquema.

-- =============================================================================
-- (1) Columnas reales de public.salidas
-- =============================================================================
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'salidas'
order by ordinal_position;

-- =============================================================================
-- (1b) ¿Existen user_id, creado_por y organization_id? (una fila sí/no)
-- =============================================================================
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'salidas'
      and column_name = 'user_id'
  ) as tiene_user_id,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'salidas'
      and column_name = 'creado_por'
  ) as tiene_creado_por,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'salidas'
      and column_name = 'organization_id'
  ) as tiene_organization_id;

-- =============================================================================
-- (2) Cuántas filas tienen organization_id IS NULL
-- (Requiere columna organization_id.)
-- =============================================================================
select count(*)::bigint as filas_organization_id_null
from public.salidas
where organization_id is null;

-- =============================================================================
-- AGREGADO A — Solo si (1b) muestra true en tiene_user_id Y tiene_creado_por.
-- Estados: recuperable_por_user_id | recuperable_por_creado_por |
--          conflicto_user_vs_creado_por | sin_match
--
-- Si vas a ejecutar todo el archivo de una vez y NO tienes esas columnas,
-- deja este bloque comentado para evitar error y usa solo AGREGADO B abajo.
-- =============================================================================
/*
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
*/

-- =============================================================================
-- AGREGADO B — Si falta user_id o creado_por: usar únicamente este resumen (inferencia inventario).
-- Estados: recuperable_desde_inventario | conflicto_inventario_multiples_orgs | sin_match
-- =============================================================================
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
