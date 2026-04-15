-- Aislamiento en base de datos: cada sesión solo ve filas de su organization_id
-- (y su propia fila por id). Ejecutar en Supabase → SQL Editor después de organization_id.

create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_profile_organization_id() from public;
grant execute on function public.current_profile_organization_id() to authenticated;
grant execute on function public.current_profile_organization_id() to service_role;

alter table public.profiles enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', r.policyname);
  end loop;
end $$;

create policy profiles_select_org
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or organization_id = public.current_profile_organization_id()
  );

create policy profiles_insert_org
  on public.profiles
  for insert
  to authenticated
  with check (
    (
      public.current_profile_organization_id() is not null
      and organization_id = public.current_profile_organization_id()
    )
    or (id = auth.uid() and organization_id = auth.uid())
  );

create policy profiles_update_org
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    or organization_id = public.current_profile_organization_id()
  )
  with check (
    organization_id = public.current_profile_organization_id()
    or (id = auth.uid() and organization_id = auth.uid())
  );
