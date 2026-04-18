-- Preview ONLY para public.inventario (organization_id NULL → inferencia).
-- Sin UPDATE ni DELETE. No commit desde este archivo.
--
-- Inferencia (en orden):
--   1) entrada_items + entradas (mismo producto normalizado y origen)
--   2) salidas (mismo producto normalizado y origen) si no hubo match claro por entradas
-- Estados posibles en el preview:
--   recuperable_desde_entrada
--   conflicto_entrada_multiples_orgs
--   recuperable_desde_salidas
--   conflicto_salidas_multiples_orgs
--   sin_match

-- =============================================================================
-- (1) ¿Existe la columna organization_id en public.inventario?
-- =============================================================================
select exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'inventario'
    and column_name = 'organization_id'
) as tiene_organization_id;

-- =============================================================================
-- (2) Cuántas filas tienen organization_id IS NULL
-- (Si (1) es false, este query falla: no hay columna.)
-- =============================================================================
select count(*)::bigint as filas_organization_id_null
from public.inventario
where organization_id is null;

-- =============================================================================
-- (2b) Mensaje explícito según el conteo (solo lectura)
-- =============================================================================
select case
  when count(*) filter (where organization_id is null) = 0
    then 'No hay filas con organization_id NULL. No hace falta inferencia.'
  else 'Hay filas con organization_id NULL. Revisa el preview (3) siguiente.'
end as resultado
from public.inventario;

-- =============================================================================
-- (3) Preview por fila: inferir organization_id y estado
-- Solo filas con organization_id IS NULL.
-- =============================================================================
with inv_null as (
  select
    i.id as inventario_id,
    lower(trim(i.producto)) as producto_norm,
    i.origen
  from public.inventario i
  where i.organization_id is null
),
orgs_entrada as (
  select
    inv_null.inventario_id,
    count(distinct e.organization_id)::bigint as num_orgs_entrada,
    min(e.organization_id::text) filter (where e.organization_id is not null)::uuid as ejemplo_org_entrada
  from inv_null
  join public.entrada_items ei
    on lower(trim(ei.producto)) = inv_null.producto_norm
  join public.entradas e
    on e.id = ei.entrada_id
   and e.origen is not distinct from inv_null.origen
   and e.organization_id is not null
  group by inv_null.inventario_id
),
orgs_salida as (
  select
    inv_null.inventario_id,
    count(distinct s.organization_id)::bigint as num_orgs_salida,
    min(s.organization_id::text) filter (where s.organization_id is not null)::uuid as ejemplo_org_salida
  from inv_null
  join public.salidas s
    on lower(trim(s.producto)) = inv_null.producto_norm
   and s.origen is not distinct from inv_null.origen
   and s.organization_id is not null
  group by inv_null.inventario_id
)
select
  n.inventario_id,
  n.producto_norm,
  n.origen,
  oe.num_orgs_entrada,
  os.num_orgs_salida,
  case
    when oe.num_orgs_entrada > 1 then 'conflicto_entrada_multiples_orgs'
    when oe.num_orgs_entrada = 1 then 'recuperable_desde_entrada'
    when coalesce(oe.num_orgs_entrada, 0) = 0 and os.num_orgs_salida > 1
      then 'conflicto_salidas_multiples_orgs'
    when coalesce(oe.num_orgs_entrada, 0) = 0 and os.num_orgs_salida = 1
      then 'recuperable_desde_salidas'
    else 'sin_match'
  end as estado,
  case
    when oe.num_orgs_entrada > 1 then null
    when oe.num_orgs_entrada = 1 then oe.ejemplo_org_entrada
    when coalesce(oe.num_orgs_entrada, 0) = 0 and os.num_orgs_salida > 1 then null
    when coalesce(oe.num_orgs_entrada, 0) = 0 and os.num_orgs_salida = 1
      then os.ejemplo_org_salida
    else null
  end as organization_id_inferido
from inv_null n
left join orgs_entrada oe on oe.inventario_id = n.inventario_id
left join orgs_salida os on os.inventario_id = n.inventario_id
order by estado, n.inventario_id;

-- =============================================================================
-- (4) Resumen agregado por estado (misma lógica que (3))
-- =============================================================================
with inv_null as (
  select
    i.id as inventario_id,
    lower(trim(i.producto)) as producto_norm,
    i.origen
  from public.inventario i
  where i.organization_id is null
),
orgs_entrada as (
  select
    inv_null.inventario_id,
    count(distinct e.organization_id)::bigint as num_orgs_entrada
  from inv_null
  join public.entrada_items ei
    on lower(trim(ei.producto)) = inv_null.producto_norm
  join public.entradas e
    on e.id = ei.entrada_id
   and e.origen is not distinct from inv_null.origen
   and e.organization_id is not null
  group by inv_null.inventario_id
),
orgs_salida as (
  select
    inv_null.inventario_id,
    count(distinct s.organization_id)::bigint as num_orgs_salida
  from inv_null
  join public.salidas s
    on lower(trim(s.producto)) = inv_null.producto_norm
   and s.origen is not distinct from inv_null.origen
   and s.organization_id is not null
  group by inv_null.inventario_id
),
tagged as (
  select
    n.inventario_id,
    case
      when oe.num_orgs_entrada > 1 then 'conflicto_entrada_multiples_orgs'
      when oe.num_orgs_entrada = 1 then 'recuperable_desde_entrada'
      when coalesce(oe.num_orgs_entrada, 0) = 0 and os.num_orgs_salida > 1
        then 'conflicto_salidas_multiples_orgs'
      when coalesce(oe.num_orgs_entrada, 0) = 0 and os.num_orgs_salida = 1
        then 'recuperable_desde_salidas'
      else 'sin_match'
    end as estado
  from inv_null n
  left join orgs_entrada oe on oe.inventario_id = n.inventario_id
  left join orgs_salida os on os.inventario_id = n.inventario_id
)
select estado, count(*)::bigint as filas
from tagged
group by estado
order by estado;
