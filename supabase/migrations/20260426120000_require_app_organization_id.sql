-- Sin asignación automática de organization_id al user id.
-- Nuevos usuarios en auth.users deben traer app_organization_id (signup / alta admin).

drop trigger if exists profiles_default_organization_id on public.profiles;
drop function if exists public.profiles_default_organization_id();

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
    debe_cambiar_password
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
