-- Excluye transferencias internas del resumen de gasto (no afectan presupuesto).

create or replace view public.gastos_resumen_mensual
with (security_invoker = true)
as
select
  user_id,
  (
    date_trunc('month', timezone('America/Mexico_City', fecha))
    at time zone 'America/Mexico_City'
  )::timestamptz as mes,
  categoria,
  sum(monto)::decimal as total,
  count(*)::bigint as cantidad
from public.gastos
where categoria <> 'Transferencia'
group by user_id, date_trunc('month', timezone('America/Mexico_City', fecha)), categoria;

grant select on public.gastos_resumen_mensual to authenticated;
