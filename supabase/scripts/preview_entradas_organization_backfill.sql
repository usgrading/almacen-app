-- Preview ONLY: filas en `entradas` con organization_id IS NULL e inferencia desde profiles.
-- Prioridad de valor inferido: user_id → profiles.organization_id, luego creado_por → profiles.organization_id.
-- Estados:
--   conflicto_user_vs_creado_por — ambos perfiles tienen organization_id distinto
--   recuperable_por_user_id     — hay org desde user_id y no hay conflicto con creado_por
--   recuperable_por_creado_por    — no hay org desde user_id pero sí desde creado_por
--   sin_match                     — ningún perfil aporta organization_id
-- Sin UPDATE.

-- -----------------------------------------------------------------------------
-- 1) Conteo de filas huérfanas en entradas
-- -----------------------------------------------------------------------------
select count(*)::bigint as filas_entradas_org_null
from public.entradas
where organization_id is null;

-- -----------------------------------------------------------------------------
-- 2) Detalle por fila (solo organization_id IS NULL en entradas)
-- -----------------------------------------------------------------------------
with src as (
  select
    e.id as entrada_id,
    e.user_id,
    e.creado_por,
    pu.organization_id as org_desde_user_id,
    pc.organization_id as org_desde_creado_por
  from public.entradas e
  left join public.profiles pu on pu.id is not distinct from e.user_id
  left join public.profiles pc on pc.id is not distinct from e.creado_por
  where e.organization_id is null
)
select
  entrada_id,
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
order by estado, entrada_id;

-- -----------------------------------------------------------------------------
-- 3) Resumen por estado (mismas reglas que arriba)
-- -----------------------------------------------------------------------------
with src as (
  select
    e.id as entrada_id,
    pu.organization_id as org_desde_user_id,
    pc.organization_id as org_desde_creado_por
  from public.entradas e
  left join public.profiles pu on pu.id is not distinct from e.user_id
  left join public.profiles pc on pc.id is not distinct from e.creado_por
  where e.organization_id is null
),
tagged as (
  select
    entrada_id,
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
