-- Día de corte para tarjetas de crédito (opcional)

alter table public.cuentas
  add column if not exists dia_corte smallint check (dia_corte is null or (dia_corte >= 1 and dia_corte <= 31));
