-- Elimina columna duplicada en inglés en `profiles` si aún existe (instalaciones antiguas).
-- El nombre de la columna legada no aparece en SQL estático; solo se usa vía SQL dinámico.

drop trigger if exists profiles_sync_rol_and_role on public.profiles;

drop function if exists public.profiles_sync_rol_and_role();

do $$
declare
  legacy_col text := 'role';
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = legacy_col
  ) then
    execute format(
      $u$
        update public.profiles
        set rol = lower(trim(%I::text))
        where %I is not null
          and lower(trim(%I::text)) in ('admin', 'manager')
          and lower(trim(coalesce(rol::text, ''))) = 'viewer'
      $u$,
      legacy_col,
      legacy_col,
      legacy_col
    );

    execute format(
      $u$
        update public.profiles
        set rol = lower(trim(%I::text))
        where %I is not null
          and (
            rol is null
            or lower(trim(rol::text)) not in ('admin', 'manager', 'viewer')
          )
      $u$,
      legacy_col,
      legacy_col
    );

    execute 'drop index if exists public.profiles_role_idx';

    execute 'alter table public.profiles drop constraint if exists profiles_role_check';

    execute format(
      'alter table public.profiles drop column if exists %I',
      legacy_col
    );
  end if;
end $$;
