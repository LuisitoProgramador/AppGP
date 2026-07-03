-- Campos de onboarding financiero (ingresos y ahorro)

alter table public.presupuestos
  add column if not exists sueldo_semanal decimal check (sueldo_semanal is null or sueldo_semanal > 0),
  add column if not exists dia_pago smallint check (dia_pago is null or (dia_pago >= 0 and dia_pago <= 6)),
  add column if not exists porcentaje_ahorro smallint check (porcentaje_ahorro is null or (porcentaje_ahorro >= 1 and porcentaje_ahorro <= 100));
