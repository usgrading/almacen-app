-- RLS multi-tenant por organization_id para tablas de negocio.
-- Helper: public.current_profile_organization_id() (20260216120000_profiles_rls_by_organization.sql).
-- No modifica políticas de profiles ni organizations.

-- ── entradas: columna tenant (antes solo filtraba por app; la BD no aislaba filas)
alter table public.entradas
  add column if not exists organization_id uuid;

create index if not exists entradas_organization_id_idx
  on public.entradas (organization_id);

update public.entradas e
set organization_id = p.organization_id
from public.profiles p
where e.user_id = p.id
  and e.organization_id is null;

update public.entradas e
set organization_id = p.organization_id
from public.profiles p
where e.creado_por is not distinct from p.id
  and e.organization_id is null;

-- inventario: asegurar columna (esquemas antiguos)
alter table public.inventario
  add column if not exists organization_id uuid;

create index if not exists inventario_organization_id_idx
  on public.inventario (organization_id);

-- ── Quitar políticas existentes en estas tablas (re-ejecutar migración sin duplicar)
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('entradas', 'entrada_items', 'inventario', 'salidas')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      r.policyname,
      r.tablename
    );
  end loop;
end $$;

-- ── RLS
alter table public.entradas enable row level security;
alter table public.entrada_items enable row level security;
alter table public.inventario enable row level security;
alter table public.salidas enable row level security;

-- entradas
create policy entradas_select_org
  on public.entradas for select to authenticated
  using (organization_id = public.current_profile_organization_id());

create policy entradas_insert_org
  on public.entradas for insert to authenticated
  with check (organization_id = public.current_profile_organization_id());

create policy entradas_update_org
  on public.entradas for update to authenticated
  using (organization_id = public.current_profile_organization_id())
  with check (organization_id = public.current_profile_organization_id());

create policy entradas_delete_org
  on public.entradas for delete to authenticated
  using (organization_id = public.current_profile_organization_id());

-- entrada_items: sin organization_id en tabla; aislamiento vía cabecera entradas
create policy entrada_items_select_org
  on public.entrada_items for select to authenticated
  using (
    exists (
      select 1 from public.entradas e
      where e.id = entrada_items.entrada_id
        and e.organization_id = public.current_profile_organization_id()
    )
  );

create policy entrada_items_insert_org
  on public.entrada_items for insert to authenticated
  with check (
    exists (
      select 1 from public.entradas e
      where e.id = entrada_items.entrada_id
        and e.organization_id = public.current_profile_organization_id()
    )
  );

create policy entrada_items_update_org
  on public.entrada_items for update to authenticated
  using (
    exists (
      select 1 from public.entradas e
      where e.id = entrada_items.entrada_id
        and e.organization_id = public.current_profile_organization_id()
    )
  )
  with check (
    exists (
      select 1 from public.entradas e
      where e.id = entrada_items.entrada_id
        and e.organization_id = public.current_profile_organization_id()
    )
  );

create policy entrada_items_delete_org
  on public.entrada_items for delete to authenticated
  using (
    exists (
      select 1 from public.entradas e
      where e.id = entrada_items.entrada_id
        and e.organization_id = public.current_profile_organization_id()
    )
  );

-- inventario
create policy inventario_select_org
  on public.inventario for select to authenticated
  using (organization_id = public.current_profile_organization_id());

create policy inventario_insert_org
  on public.inventario for insert to authenticated
  with check (organization_id = public.current_profile_organization_id());

create policy inventario_update_org
  on public.inventario for update to authenticated
  using (organization_id = public.current_profile_organization_id())
  with check (organization_id = public.current_profile_organization_id());

create policy inventario_delete_org
  on public.inventario for delete to authenticated
  using (organization_id = public.current_profile_organization_id());

-- salidas (columna añadida en 20260218120000_salidas_organization_id.sql)
create policy salidas_select_org
  on public.salidas for select to authenticated
  using (organization_id = public.current_profile_organization_id());

create policy salidas_insert_org
  on public.salidas for insert to authenticated
  with check (organization_id = public.current_profile_organization_id());

create policy salidas_update_org
  on public.salidas for update to authenticated
  using (organization_id = public.current_profile_organization_id())
  with check (organization_id = public.current_profile_organization_id());

create policy salidas_delete_org
  on public.salidas for delete to authenticated
  using (organization_id = public.current_profile_organization_id());

grant select, insert, update, delete on public.entradas to authenticated;
grant select, insert, update, delete on public.entrada_items to authenticated;
grant select, insert, update, delete on public.inventario to authenticated;
grant select, insert, update, delete on public.salidas to authenticated;
