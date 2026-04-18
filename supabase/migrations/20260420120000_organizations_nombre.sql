-- Compatibilidad: organizaciones con nombre visible (NOT NULL).
alter table public.organizations
  add column if not exists nombre text;

update public.organizations
set nombre = 'Organización'
where nombre is null;

alter table public.organizations
  alter column nombre set not null;
