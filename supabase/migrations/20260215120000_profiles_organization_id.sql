-- Cada cuenta raíz y sus usuarios creados comparten organization_id (= UUID del dueño de la cuenta).
-- Autoregistro: organization_id = id del propio usuario (solo él en su "organización").
-- Ejecutar en Supabase → SQL Editor.

alter table public.profiles
  add column if not exists organization_id uuid;

update public.profiles
set organization_id = id
where organization_id is null;

alter table public.profiles
  alter column organization_id set not null;

create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

-- Si un INSERT no envía organization_id (p. ej. trigger desde auth), queda la cuenta como su propia org.
create or replace function public.profiles_default_organization_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_default_organization_id on public.profiles;
create trigger profiles_default_organization_id
  before insert on public.profiles
  for each row
  execute procedure public.profiles_default_organization_id();
