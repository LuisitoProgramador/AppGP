-- RPC atómico para transferencias internas y pagos a tarjeta.
-- Fuente canónica: supabase/migrations/20260704224500_transferencia_exception_handler.sql
-- Ejecutar en el SQL Editor de Supabase después de cuentas_schema.sql e ingresos_cuenta_schema.sql

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
  v_fecha timestamptz := timezone('utc', now());
  v_descripcion_salida text;
  v_descripcion_entrada text;
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

  begin
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

    if v_destino.tipo = 'credito' then
      v_descripcion_salida := format('Pago a tarjeta %s', v_destino.nombre);
      v_descripcion_entrada := null;
    else
      v_descripcion_salida := format('Transferencia a %s', v_destino.nombre);
      v_descripcion_entrada := format('Transferencia desde %s', v_origen.nombre);
    end if;

    insert into public.gastos (user_id, monto, categoria, descripcion, fecha, cuenta_id)
    values (
      v_user_id,
      p_monto,
      'Transferencia',
      v_descripcion_salida,
      v_fecha,
      p_origen_id
    );

    if v_descripcion_entrada is not null
      and v_destino.tipo in ('efectivo', 'debito') then
      insert into public.ingresos_cuenta (user_id, cuenta_id, monto, descripcion, fecha)
      values (
        v_user_id,
        p_destino_id,
        p_monto,
        v_descripcion_entrada,
        v_fecha
      );
    end if;
  exception
    when others then
      raise exception 'Transferencia fallida: %', SQLERRM;
  end;
end;
$$;

grant execute on function public.realizar_transferencia(uuid, uuid, decimal) to authenticated;
