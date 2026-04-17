-- `profiles.rol` se fija en el INSERT: prioridad a `raw_user_meta_data.app_rol` (lo envía el API
-- con createUser) y si no es válido, 'viewer'. Nada depende de DEFAULT de la tabla.

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
    new.id,
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
