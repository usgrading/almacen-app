-- =============================================================================
-- Preview + backfill ORGANIZATION_ID para filas huérfanas (organization_id IS NULL)
-- Tablas: public.entradas, public.inventario, public.salidas
--
-- IMPORTANTE:
-- - Ejecuta primero SOLO los bloques marcados [PREVIEW] (son SELECT).
-- - Los bloques [BACKFILL] son UPDATE: déjalos comentados hasta revisar el preview.
-- - Ejecutar en Supabase SQL Editor con rol que bypass RLS (postgres / service role en migración).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- [PREVIEW] 0) Columnas disponibles (útil si tu esquema difiere del esperado)
-- -----------------------------------------------------------------------------
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('entradas', 'inventario', 'salidas')
order by table_name, ordinal_position;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 1) Conteos de filas con organization_id IS NULL por tabla
-- -----------------------------------------------------------------------------
select 'entradas' as tabla, count(*)::bigint as filas_org_null
from public.entradas
where organization_id is null
union all
select 'inventario', count(*)::bigint
from public.inventario
where organization_id is null
union all
select 'salidas', count(*)::bigint
from public.salidas
where organization_id is null;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 2) ENTRADAS — inferencia desde profiles (user_id, creado_por)
-- estado:
--   recuperable_sin_conflicto → un solo origen da organization_id
--   conflicto_user_vs_creado → user_id y creado_por apuntan a org distintas
--   sin_perfil → no hay profiles para esos UUIDs
-- -----------------------------------------------------------------------------
with base as (
  select
    e.id,
    e.user_id,
    e.creado_por,
    e.organization_id as org_actual,
    pu.organization_id as org_desde_user_id,
    pc.organization_id as org_desde_creado_por
  from public.entradas e
  left join public.profiles pu on pu.id = e.user_id
  left join public.profiles pc on pc.id = e.creado_por
  where e.organization_id is null
)
select
  id,
  user_id,
  creado_por,
  org_desde_user_id,
  org_desde_creado_por,
  case
    when org_desde_user_id is not null
      and org_desde_creado_por is not null
      and org_desde_user_id <> org_desde_creado_por
      then 'conflicto_user_vs_creado'
    when coalesce(org_desde_user_id, org_desde_creado_por) is not null
      then 'recuperable_sin_conflicto'
    else 'sin_perfil_o_sin_org_en_profiles'
  end as estado,
  coalesce(org_desde_user_id, org_desde_creado_por) as org_inferida_recomendada
from base
order by estado, id;

-- Resumen agregado entradas
with base as (
  select
    e.id,
    pu.organization_id as org_desde_user_id,
    pc.organization_id as org_desde_creado_por
  from public.entradas e
  left join public.profiles pu on pu.id = e.user_id
  left join public.profiles pc on pc.id = e.creado_por
  where e.organization_id is null
),
tag as (
  select
    id,
    case
      when org_desde_user_id is not null
        and org_desde_creado_por is not null
        and org_desde_user_id <> org_desde_creado_por
        then 'conflicto_user_vs_creado'
      when coalesce(org_desde_user_id, org_desde_creado_por) is not null
        then 'recuperable_sin_conflicto'
      else 'sin_perfil_o_sin_org_en_profiles'
    end as estado
  from base
)
select estado, count(*)::bigint as filas
from tag
group by estado
order by estado;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 3) SALIDAS — si existe user_id / creado_por / created_by en la tabla
-- (Si la columna no existe, Postgres devolverá error: ignora esta sección o adapta.)
-- -----------------------------------------------------------------------------
-- Descomenta si tu tabla tiene user_id:
-- select s.id, s.organization_id, p.organization_id as org_desde_user
-- from public.salidas s
-- left join public.profiles p on p.id = s.user_id
-- where s.organization_id is null;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 3b) SALIDAS — inferencia cruzada desde inventario (mismo producto + origen)
-- Toma una fila de inventario de referencia con organization_id no nulo por (producto, origen).
-- Si hay varias orgs para el mismo par, aparece en "salidas_inferencia_ambigua".
-- -----------------------------------------------------------------------------
with inv_ref as (
  select distinct on (lower(trim(producto)), origen)
    lower(trim(producto)) as producto_norm,
    origen,
    organization_id as org_inv,
    id as inventario_ref_id
  from public.inventario
  where organization_id is not null
  order by lower(trim(producto)), origen, id
),
inv_amb as (
  select lower(trim(producto)) as producto_norm, origen, count(distinct organization_id)::int as num_orgs
  from public.inventario
  where organization_id is not null
  group by lower(trim(producto)), origen
  having count(distinct organization_id) > 1
),
sal as (
  select
    s.id as salida_id,
    lower(trim(s.producto)) as producto_norm,
    s.origen,
    inv_ref.org_inv,
    inv_ref.inventario_ref_id,
    case when inv_amb.producto_norm is not null then true else false end as par_ambiguo_en_inventario
  from public.salidas s
  left join inv_ref
    on inv_ref.producto_norm = lower(trim(s.producto))
   and inv_ref.origen is not distinct from s.origen
  left join inv_amb
    on inv_amb.producto_norm = lower(trim(s.producto))
   and inv_amb.origen is not distinct from s.origen
  where s.organization_id is null
)
select *
from sal
order by par_ambiguo_en_inventario desc, salida_id;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 3c) SALIDAS — sólo recuperables sin ambigüedad de inventario
-- -----------------------------------------------------------------------------
with inv_ref as (
  select distinct on (lower(trim(producto)), origen)
    lower(trim(producto)) as producto_norm,
    origen,
    organization_id as org_inv
  from public.inventario
  where organization_id is not null
  order by lower(trim(producto)), origen, id
),
inv_amb as (
  select lower(trim(producto)) as producto_norm, origen
  from public.inventario
  where organization_id is not null
  group by lower(trim(producto)), origen
  having count(distinct organization_id) > 1
)
select s.id, s.producto, s.origen, inv_ref.org_inv as organization_id_inferido
from public.salidas s
join inv_ref
  on inv_ref.producto_norm = lower(trim(s.producto))
 and inv_ref.origen is not distinct from s.origen
left join inv_amb amb
  on amb.producto_norm = lower(trim(s.producto))
 and amb.origen is not distinct from s.origen
where s.organization_id is null
  and amb.producto_norm is null;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 4) INVENTARIO — inferencia desde entradas vía entrada_items + misma línea/origen
-- Une por producto normalizado y origen de la cabecera entrada.
-- Si varias cabeceras dan organizaciones distintas, revisar manualmente (lista al final).
-- -----------------------------------------------------------------------------
with match_entrada as (
  select
    i.id as inventario_id,
    i.producto,
    i.origen,
    e.id as entrada_id,
    e.organization_id as org_entrada,
    e.creado_en
  from public.inventario i
  join public.entrada_items ei on lower(trim(ei.producto)) = lower(trim(i.producto))
  join public.entradas e on e.id = ei.entrada_id and e.origen is not distinct from i.origen
  where i.organization_id is null
    and e.organization_id is not null
),
ranked as (
  select distinct on (inventario_id)
    inventario_id,
    entrada_id,
    org_entrada,
    creado_en
  from match_entrada
  order by inventario_id, creado_en desc nulls last, entrada_id desc
),
orgs_per_inv as (
  select
    i.id as inventario_id,
    count(distinct e.organization_id)::int as num_orgs_distintas
  from public.inventario i
  join public.entrada_items ei on lower(trim(ei.producto)) = lower(trim(i.producto))
  join public.entradas e on e.id = ei.entrada_id and e.origen is not distinct from i.origen
  where i.organization_id is null
    and e.organization_id is not null
  group by i.id
)
select
  r.inventario_id,
  r.org_entrada as organization_id_inferido,
  o.num_orgs_distintas,
  case
    when o.num_orgs_distintas > 1 then 'revisar_conflicto_multiples_entradas'
    else 'recuperable_desde_entrada'
  end as estado
from ranked r
join orgs_per_inv o on o.inventario_id = r.inventario_id
order by estado desc, inventario_id;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 4b) INVENTARIO — inferencia desde salidas con organization_id conocido (mismo producto + origen)
-- -----------------------------------------------------------------------------
with sal_ref as (
  select distinct on (lower(trim(producto)), origen)
    lower(trim(producto)) as producto_norm,
    origen,
    organization_id as org_sal
  from public.salidas
  where organization_id is not null
  order by lower(trim(producto)), origen, id
),
sal_amb as (
  select lower(trim(producto)) as producto_norm, origen
  from public.salidas
  where organization_id is not null
  group by lower(trim(producto)), origen
  having count(distinct organization_id) > 1
)
select
  i.id,
  i.producto,
  i.origen,
  sal_ref.org_sal as organization_id_inferido,
  case when sal_amb.producto_norm is not null then true else false end as par_ambiguo_en_salidas
from public.inventario i
left join sal_ref
  on sal_ref.producto_norm = lower(trim(i.producto))
 and sal_ref.origen is not distinct from i.origen
left join sal_amb
  on sal_amb.producto_norm = lower(trim(i.producto))
 and sal_amb.origen is not distinct from i.origen
where i.organization_id is null
  and sal_ref.org_sal is not null
order by par_ambiguo_en_salidas desc, i.id;

-- -----------------------------------------------------------------------------
-- [PREVIEW] 5) INVENTARIO — filas que siguen sin camino automático (tras las reglas anteriores)
-- Ajusta esta consulta tras ejecutar backfills en orden lógico.
-- -----------------------------------------------------------------------------
select i.id, i.producto, i.origen, i.organization_id
from public.inventario i
where i.organization_id is null
  and not exists (
    select 1
    from public.entrada_items ei
    join public.entradas e on e.id = ei.entrada_id and e.origen is not distinct from i.origen
    where lower(trim(ei.producto)) = lower(trim(i.producto))
      and e.organization_id is not null
  )
  and not exists (
    select 1
    from public.salidas s
    where s.organization_id is not null
      and lower(trim(s.producto)) = lower(trim(i.producto))
      and s.origen is not distinct from i.origen
  );

-- =============================================================================
-- [BACKFILL] — NO EJECUTAR hasta aprobar los SELECT de arriba.
-- Descomenta un bloque a la vez y revisa GET DIAGNOSTICS / row count.
-- Orden sugerido: entradas → inventario (entradas + salidas) → salidas (inventario)
-- =============================================================================

/*
-- --- A) ENTRADAS: primero por user_id; luego por creado_por donde sigue NULL ---
-- (Si user_id y creado_por implicaran org distintas, esta secuencia deja prioridad al perfil de user_id.)
update public.entradas e
set organization_id = pu.organization_id
from public.profiles pu
where e.organization_id is null
  and e.user_id is not distinct from pu.id
  and pu.organization_id is not null;

update public.entradas e
set organization_id = pc.organization_id
from public.profiles pc
where e.organization_id is null
  and e.creado_por is not distinct from pc.id
  and pc.organization_id is not null;

-- Filas que siguen null: revisar manualmente las marcadas conflicto_user_vs_creado en el preview.
*/

/*
-- --- B) SALIDAS: desde inventario (solo par producto+origen sin ambigüedad) ---
with inv_ref as (
  select distinct on (lower(trim(producto)), origen)
    lower(trim(producto)) as producto_norm,
    origen,
    organization_id as org_inv
  from public.inventario
  where organization_id is not null
  order by lower(trim(producto)), origen, id
),
inv_amb as (
  select lower(trim(producto)) as producto_norm, origen
  from public.inventario
  where organization_id is not null
  group by lower(trim(producto)), origen
  having count(distinct organization_id) > 1
)
update public.salidas s
set organization_id = inv_ref.org_inv
from inv_ref
left join inv_amb amb
  on amb.producto_norm = lower(trim(s.producto))
 and amb.origen is not distinct from s.origen
where s.organization_id is null
  and inv_ref.producto_norm = lower(trim(s.producto))
  and inv_ref.origen is not distinct from s.origen
  and amb.producto_norm is null;
*/

/*
-- --- C) INVENTARIO: última entrada coincidente con cabecera ya con organization_id ---
with best as (
  select distinct on (i.id)
    i.id as inventario_id,
    e.organization_id as org_entrada
  from public.inventario i
  join public.entrada_items ei on lower(trim(ei.producto)) = lower(trim(i.producto))
  join public.entradas e on e.id = ei.entrada_id and e.origen is not distinct from i.origen
  where i.organization_id is null
    and e.organization_id is not null
  order by i.id, e.creado_en desc nulls last, e.id desc
),
multi as (
  select i.id as inventario_id
  from public.inventario i
  join public.entrada_items ei on lower(trim(ei.producto)) = lower(trim(i.producto))
  join public.entradas e on e.id = ei.entrada_id and e.origen is not distinct from i.origen
  where i.organization_id is null
    and e.organization_id is not null
  group by i.id
  having count(distinct e.organization_id) > 1
)
update public.inventario i
set organization_id = best.org_entrada
from best
where i.id = best.inventario_id
  and i.organization_id is null
  and best.inventario_id not in (select inventario_id from multi);
*/

/*
-- --- D) INVENTARIO: restantes desde salidas (sin ambigüedad en salidas por producto+origen) ---
with sal_ref as (
  select distinct on (lower(trim(producto)), origen)
    lower(trim(producto)) as producto_norm,
    origen,
    organization_id as org_sal
  from public.salidas
  where organization_id is not null
  order by lower(trim(producto)), origen, id
),
sal_amb as (
  select lower(trim(producto)) as producto_norm, origen
  from public.salidas
  where organization_id is not null
  group by lower(trim(producto)), origen
  having count(distinct organization_id) > 1
)
update public.inventario i
set organization_id = sal_ref.org_sal
from sal_ref
left join sal_amb amb
  on amb.producto_norm = lower(trim(i.producto))
 and amb.origen is not distinct from i.origen
where i.organization_id is null
  and sal_ref.producto_norm = lower(trim(i.producto))
  and sal_ref.origen is not distinct from i.origen
  and amb.producto_norm is null;
*/

/*
-- --- E) ELIMINACIÓN (opcional, destructivo): inventario/salidas/entradas sin org tras backfill ---
-- Solo tras decisión explícita de negocio.
-- delete from public.inventario where organization_id is null;
*/
