-- Renombra debe_cambiar_password → must_change_password (nombre estándar en la app).
-- Índice único global insensible a mayúsculas para login por username interno.
-- Actualiza handle_new_user para insertar must_change_password.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'debe_cambiar_password'
  ) then
    alter table public.profiles
      rename column debe_cambiar_password to must_change_password;
  end if;
end $$;

comment on column public.profiles.must_change_password is
  'Si es true, el usuario debe cambiar contraseña antes de usar la app (primer acceso internos).';

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and trim(username) <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  uname text;
  meta_rol text;
  rol_final text;
  meta_org text;
  org_id_final uuid;
begin
  base := lower(split_part(coalesce(new.email, ''), '@', 1));
  base := regexp_replace(coalesce(nullif(trim(base), ''), 'user'), '[^a-z0-9._-]', '_', 'g');
  uname := left(base, 32) || '_' || left(replace(new.id::text, '-', ''), 12);

  meta_rol := lower(trim(coalesce(new.raw_user_meta_data->>'app_rol', '')));
  if meta_rol in ('admin', 'manager', 'viewer') then
    rol_final := meta_rol;
  else
    rol_final := 'viewer';
  end if;

  meta_org := trim(coalesce(new.raw_user_meta_data->>'app_organization_id', ''));
  if meta_org = '' then
    raise exception
      'Falta app_organization_id en user metadata. Use el registro de la aplicación (signup o alta de usuario).';
  end if;

  begin
    org_id_final := meta_org::uuid;
  exception
    when invalid_text_representation then
      raise exception 'app_organization_id no es un UUID válido.';
  end;

  insert into public.profiles (
    id,
    organization_id,
    email,
    nombre,
    username,
    rol,
    activo,
    must_change_password
  )
  values (
    new.id,
    org_id_final,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'nombre',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    uname,
    rol_final,
    true,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
