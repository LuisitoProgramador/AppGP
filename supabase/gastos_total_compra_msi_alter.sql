-- Total de compra MSI persistido (evita inferir desde descripción en borrados offline).

alter table public.gastos
  add column if not exists total_compra_msi decimal
  check (total_compra_msi is null or total_compra_msi > 0);

-- Backfill: filas MSI existentes con descripción parseable.
update public.gastos g
set total_compra_msi = round((g.monto * (substring(g.descripcion from '\(MSI \d+/(\d+)\)$'))::int)::numeric, 2)
where g.es_msi = true
  and g.total_compra_msi is null
  and g.descripcion ~ '\(MSI \d+/\d+\)$';
