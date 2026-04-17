-- Una fila en `organizations` por cada organización (signup público inserta desde la API).
-- `profiles.organization_id` apunta a ese UUID (no depende del “primer usuario global”).

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

drop policy if exists organizations_select_member on public.organizations;

create policy organizations_select_member
  on public.organizations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = organizations.id
    )
  );

grant select on public.organizations to authenticated;

-- Metadatos del API: app_rol, app_organization_id (uuid). Fallback legado: org = usuario.
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
    org_id_final := new.id;
  else
    begin
      org_id_final := meta_org::uuid;
    exception
      when invalid_text_representation then
        org_id_final := new.id;
    end;
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
