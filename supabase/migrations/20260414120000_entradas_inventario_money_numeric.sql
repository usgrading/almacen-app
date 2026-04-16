-- Costos con 2 decimales (centavos). Los valores existentes se convierten sin pérdida material.
alter table entradas
  alter column costo_unitario type numeric(10, 2)
  using round(costo_unitario::numeric, 2);

alter table entradas
  alter column costo_total type numeric(10, 2)
  using round(costo_total::numeric, 2);

alter table inventario
  alter column costo_unitario type numeric(10, 2)
  using round(costo_unitario::numeric, 2);
