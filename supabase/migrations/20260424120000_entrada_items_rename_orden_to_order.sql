-- Alineación con PG/Supabase: columna de secuencia como "order" (palabra reservada → identificador entre comillas).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'entrada_items'
      and column_name = 'orden'
  ) then
    execute 'alter table public.entrada_items rename column orden to "order"';
  end if;
end;
$$;
