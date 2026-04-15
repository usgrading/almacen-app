-- Opcional: corrige "Database error saving new user" cuando un trigger en auth.users
-- inserta en profiles sin SECURITY DEFINER, sin organization_id, o con username duplicado.
-- Ejecutar solo si tienes un trigger roto; si ya tienes uno bueno, revisa y no dupliques.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  uname text;
begin
  base := lower(split_part(coalesce(new.email, ''), '@', 1));
  base := regexp_replace(coalesce(nullif(trim(base), ''), 'user'), '[^a-z0-9._-]', '_', 'g');
  uname := left(base, 32) || '_' || left(replace(new.id::text, '-', ''), 12);

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
    'viewer',
    true,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
