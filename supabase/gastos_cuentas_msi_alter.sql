-- Ejecutar después de cuentas_schema.sql
-- Añade soporte de cuenta y MSI a la tabla gastos existente

alter table public.gastos
  add column if not exists cuenta_id uuid references public.cuentas on delete set null,
  add column if not exists es_msi boolean not null default false,
  add column if not exists grupo_msi_id uuid;

create index if not exists gastos_cuenta_id_idx on public.gastos (cuenta_id);
create index if not exists gastos_grupo_msi_id_idx on public.gastos (grupo_msi_id)
  where grupo_msi_id is not null;
