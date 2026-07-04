-- RPC atómico para editar gastos normales (no MSI) con ajuste de saldo en cuenta.
-- Ejecutar después de gastos_cuentas_msi_alter.sql y gastos_past_edit_guard.sql

create or replace function public.update_gasto_simple(
  p_gasto_id bigint,
  p_monto numeric,
  p_categoria text,
  p_descripcion text,
  p_cuenta_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_gasto record;
  v_cuenta_tipo public.cuenta_tipo;
  v_saldo numeric;
  v_saldo_delta numeric;
  v_monto_original numeric;
  v_delta numeric;
begin
  perform set_config('app.bypass_past_gasto_guard', 'true', true);

  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  p_monto := round(p_monto::numeric, 2);

  select id, user_id, monto, cuenta_id, es_msi
  into v_gasto
  from public.gastos
  where id = p_gasto_id
  for update;

  if not found then
    raise exception 'Gasto no encontrado';
  end if;

  if v_gasto.user_id is distinct from v_user_id then
    raise exception 'Sin permiso sobre este gasto';
  end if;

  if coalesce(v_gasto.es_msi, false) then
    raise exception 'Los gastos MSI deben editarse con update_msi_grupo';
  end if;

  v_monto_original := round(v_gasto.monto::numeric, 2);

  if v_gasto.cuenta_id is distinct from p_cuenta_id then
    if v_gasto.cuenta_id is not null then
      select tipo, saldo_actual
      into v_cuenta_tipo, v_saldo
      from public.cuentas
      where id = v_gasto.cuenta_id
        and user_id = v_user_id
      for update;

      if not found then
        raise exception 'Cuenta anterior no encontrada';
      end if;

      if v_cuenta_tipo = 'credito' then
        v_saldo_delta := -v_monto_original;
      else
        v_saldo_delta := v_monto_original;
      end if;

      update public.cuentas
      set saldo_actual = round((v_saldo + v_saldo_delta)::numeric, 2)
      where id = v_gasto.cuenta_id
        and user_id = v_user_id;
    end if;

    if p_cuenta_id is not null then
      select tipo, saldo_actual
      into v_cuenta_tipo, v_saldo
      from public.cuentas
      where id = p_cuenta_id
        and user_id = v_user_id
      for update;

      if not found then
        raise exception 'Cuenta nueva no encontrada';
      end if;

      if v_cuenta_tipo = 'credito' then
        v_saldo_delta := p_monto;
      else
        v_saldo_delta := -p_monto;
      end if;

      update public.cuentas
      set saldo_actual = round((v_saldo + v_saldo_delta)::numeric, 2)
      where id = p_cuenta_id
        and user_id = v_user_id;
    end if;

  elsif v_gasto.cuenta_id is not null and v_monto_original is distinct from p_monto then
    v_delta := round((p_monto - v_monto_original)::numeric, 2);

    if v_delta <> 0 then
      select tipo, saldo_actual
      into v_cuenta_tipo, v_saldo
      from public.cuentas
      where id = v_gasto.cuenta_id
        and user_id = v_user_id
      for update;

      if not found then
        raise exception 'Cuenta no encontrada';
      end if;

      if v_cuenta_tipo = 'credito' then
        v_saldo_delta := v_delta;
      else
        v_saldo_delta := -v_delta;
      end if;

      update public.cuentas
      set saldo_actual = round((v_saldo + v_saldo_delta)::numeric, 2)
      where id = v_gasto.cuenta_id
        and user_id = v_user_id;
    end if;
  end if;

  update public.gastos
  set
    monto = p_monto,
    categoria = p_categoria,
    descripcion = nullif(trim(p_descripcion), ''),
    cuenta_id = p_cuenta_id
  where id = p_gasto_id
    and user_id = v_user_id;
end;
$$;

grant execute on function public.update_gasto_simple(
  bigint, numeric, text, text, uuid
) to authenticated;
