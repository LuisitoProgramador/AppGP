-- Ingresos mensuales y extras (onboarding refactor)

alter table public.presupuestos
  add column if not exists sueldo_mensual decimal check (sueldo_mensual is null or sueldo_mensual > 0),
  add column if not exists ingresos_extras decimal not null default 0 check (ingresos_extras >= 0);

-- Migrar datos existentes de sueldo semanal a mensual
update public.presupuestos
set sueldo_mensual = round(sueldo_semanal * 4.33, 2)
where sueldo_mensual is null and sueldo_semanal is not null;
