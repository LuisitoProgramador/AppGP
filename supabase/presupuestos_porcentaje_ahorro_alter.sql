-- Alinear rango de porcentaje_ahorro con la UI (5–50%, pasos de 5)
alter table public.presupuestos
  drop constraint if exists presupuestos_porcentaje_ahorro_check;

alter table public.presupuestos
  add constraint presupuestos_porcentaje_ahorro_check
  check (
    porcentaje_ahorro is null
    or (
      porcentaje_ahorro >= 5
      and porcentaje_ahorro <= 50
      and porcentaje_ahorro % 5 = 0
    )
  );
