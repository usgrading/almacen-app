-- Detalle de líneas por entrada: cabecera en `entradas`, renglones en `entrada_items`.

create table if not exists public.entrada_items (
  id uuid primary key default gen_random_uuid(),
  entrada_id uuid not null references public.entradas (id) on delete cascade,
  producto text not null,
  cantidad numeric(14, 4) not null default 0,
  unidad text not null,
  costo_unitario numeric(10, 2),
  costo_total numeric(10, 2),
  ubicacion text,
  foto_pieza text,
  orden integer not null default 0
);

create index if not exists entrada_items_entrada_id_idx on public.entrada_items (entrada_id);

-- Datos existentes: una línea por cada fila histórica de `entradas`.
insert into public.entrada_items (
  entrada_id,
  producto,
  cantidad,
  unidad,
  costo_unitario,
  costo_total,
  ubicacion,
  foto_pieza,
  orden
)
select
  e.id,
  coalesce(nullif(trim(e.producto), ''), '(sin nombre)'),
  coalesce(e.cantidad, 0),
  coalesce(nullif(trim(e.unidad), ''), 'Pieza'),
  e.costo_unitario,
  e.costo_total,
  coalesce(e.ubicacion, ''),
  e.foto_pieza,
  0
from public.entradas e
where not exists (
  select 1 from public.entrada_items i where i.entrada_id = e.id
);

-- Total de documento (referencia OCR / factura), opcional; distinto del total por línea.
alter table public.entradas
  add column if not exists costo_total_factura numeric(10, 2);

-- Campos de línea pasan al detalle.
alter table public.entradas drop column if exists producto;
alter table public.entradas drop column if exists cantidad;
alter table public.entradas drop column if exists unidad;
alter table public.entradas drop column if exists costo_unitario;
alter table public.entradas drop column if exists costo_total;
alter table public.entradas drop column if exists ubicacion;
alter table public.entradas drop column if exists foto_pieza;
