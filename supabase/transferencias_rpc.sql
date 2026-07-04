-- RPC atómico para transferencias internas y pagos a tarjeta.
-- Ejecutar en el SQL Editor de Supabase después de cuentas_schema.sql

create or replace function public.realizar_transferencia(
  p_origen_id uuid,
  p_destino_id uuid,
  p_monto decimal
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_origen public.cuentas%rowtype;
  v_destino public.cuentas%rowtype;
  v_nuevo_saldo_origen decimal;
  v_nuevo_saldo_destino decimal;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if p_origen_id is null or p_destino_id is null then
    raise exception 'Cuentas de origen y destino son requeridas';
  end if;

  if p_origen_id = p_destino_id then
    raise exception 'La cuenta de origen y destino deben ser diferentes';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  select *
  into v_origen
  from public.cuentas
  where id = p_origen_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Cuenta de origen no encontrada';
  end if;

  select *
  into v_destino
  from public.cuentas
  where id = p_destino_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Cuenta de destino no encontrada';
  end if;

  if v_origen.tipo in ('efectivo', 'debito') then
    if v_origen.saldo_actual < p_monto then
      raise exception 'Saldo insuficiente en la cuenta de origen';
    end if;
  elsif v_origen.tipo = 'credito' then
    if v_origen.limite_credito is not null
      and (v_origen.saldo_actual + p_monto) > v_origen.limite_credito then
      raise exception 'Crédito insuficiente en la cuenta de origen';
    end if;
  end if;

  if v_destino.tipo = 'credito' and v_destino.saldo_actual < p_monto then
    raise exception 'El pago supera la deuda de la tarjeta';
  end if;

  if v_origen.tipo = 'credito' then
    v_nuevo_saldo_origen := round((v_origen.saldo_actual + p_monto)::numeric, 2);
  else
    v_nuevo_saldo_origen := round((v_origen.saldo_actual - p_monto)::numeric, 2);
  end if;

  if v_destino.tipo = 'credito' then
    v_nuevo_saldo_destino := round((v_destino.saldo_actual - p_monto)::numeric, 2);
  else
    v_nuevo_saldo_destino := round((v_destino.saldo_actual + p_monto)::numeric, 2);
  end if;

  update public.cuentas
  set saldo_actual = v_nuevo_saldo_origen
  where id = p_origen_id;

  update public.cuentas
  set saldo_actual = v_nuevo_saldo_destino
  where id = p_destino_id;
end;
$$;

grant execute on function public.realizar_transferencia(uuid, uuid, decimal) to authenticated;
