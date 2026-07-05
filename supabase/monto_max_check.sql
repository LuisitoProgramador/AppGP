-- Tope de monto alineado con src/types/limits.ts (MAX_MONTO = 1_000_000).

alter table public.gastos
  drop constraint if exists gastos_monto_check,
  add constraint gastos_monto_check check (monto > 0 and monto <= 1000000);

alter table public.gastos_recurrentes
  drop constraint if exists gastos_recurrentes_monto_check,
  add constraint gastos_recurrentes_monto_check check (monto > 0 and monto <= 1000000);

alter table public.ingresos_cuenta
  drop constraint if exists ingresos_cuenta_monto_check,
  add constraint ingresos_cuenta_monto_check check (monto > 0 and monto <= 1000000);

alter table public.metas_ahorro
  drop constraint if exists metas_ahorro_monto_objetivo_check,
  add constraint metas_ahorro_monto_objetivo_check check (monto_objetivo > 0 and monto_objetivo <= 1000000);
