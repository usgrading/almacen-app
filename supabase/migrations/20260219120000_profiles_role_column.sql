-- Campo "role" (inglés) alineado con la app; se mantiene "rol" sincronizado vía backfill.
-- Valores: 'admin', 'manager', 'viewer'

alter table public.profiles
  add column if not exists "role" text;

update public.profiles
set "role" = lower(trim(rol::text))
where "role" is null
  and rol is not null
  and trim(rol::text) in ('admin', 'manager', 'viewer');

update public.profiles
set "role" = 'viewer'
where "role" is null
   or lower(trim("role")) not in ('admin', 'manager', 'viewer');

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check ("role" in ('admin', 'manager', 'viewer'));

-- Mantener columna legada "rol" alineada para código que aún la escribe
update public.profiles
set rol = "role"
where rol is distinct from "role";

create index if not exists profiles_role_idx on public.profiles ("role");
