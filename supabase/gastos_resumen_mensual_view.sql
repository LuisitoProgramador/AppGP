-- Vista que pre-calcula totales mensuales por usuario y categoría

create or replace view public.gastos_resumen_mensual
with (security_invoker = true)
as
select
  user_id,
  date_trunc('month', fecha)::timestamptz as mes,
  categoria,
  sum(monto)::decimal as total,
  count(*)::bigint as cantidad
from public.gastos
group by user_id, date_trunc('month', fecha), categoria;

grant select on public.gastos_resumen_mensual to authenticated;
