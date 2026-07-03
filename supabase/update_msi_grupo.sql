-- RPC atómico para redistribuir / rearmar un grupo MSI (cambio de total, meses o cuotas).
-- Ejecutar en el SQL Editor de Supabase después de gastos_cuentas_msi_alter.sql

create or replace function public.update_msi_grupo(
  p_grupo_msi_id uuid,
  p_categoria text,
  p_cuenta_id uuid,
  p_installments jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing_ids bigint[];
  v_existing_count int;
  v_new_count int;
  v_installment jsonb;
  v_idx int;
  v_new_id bigint;
  v_updated_ids bigint[] := '{}';
  v_inserted_ids bigint[] := '{}';
  v_deleted_ids bigint[] := '{}';
begin
  perform set_config('app.bypass_past_gasto_guard', 'true', true);

  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if p_grupo_msi_id is null then
    raise exception 'grupo_msi_id requerido';
  end if;

  v_new_count := jsonb_array_length(p_installments);
  if v_new_count is null or v_new_count < 2 or v_new_count > 48 then
    raise exception 'El número de cuotas debe estar entre 2 y 48';
  end if;

  if exists (
    select 1
    from public.gastos g
    where g.grupo_msi_id = p_grupo_msi_id
      and g.user_id is distinct from v_user_id
  ) then
    raise exception 'Sin permiso sobre este grupo MSI';
  end if;

  select coalesce(array_agg(id order by fecha asc), '{}')
  into v_existing_ids
  from public.gastos
  where grupo_msi_id = p_grupo_msi_id
    and user_id = v_user_id;

  v_existing_count := coalesce(array_length(v_existing_ids, 1), 0);
  if v_existing_count = 0 then
    raise exception 'Grupo MSI no encontrado';
  end if;

  for v_idx in 0..(v_new_count - 1) loop
    v_installment := p_installments -> v_idx;
    if coalesce((v_installment->>'monto')::numeric, 0) <= 0 then
      raise exception 'Cada cuota debe tener monto mayor a 0';
    end if;
    if coalesce(trim(v_installment->>'descripcion'), '') = '' then
      raise exception 'Cada cuota requiere descripción';
    end if;
    if v_installment->>'fecha' is null then
      raise exception 'Cada cuota requiere fecha';
    end if;
  end loop;

  for v_idx in 1..v_new_count loop
    v_installment := p_installments -> (v_idx - 1);

    if v_idx <= v_existing_count then
      update public.gastos
      set
        monto = (v_installment->>'monto')::numeric,
        descripcion = v_installment->>'descripcion',
        fecha = (v_installment->>'fecha')::timestamptz,
        categoria = p_categoria,
        cuenta_id = p_cuenta_id,
        es_msi = true,
        grupo_msi_id = p_grupo_msi_id
      where id = v_existing_ids[v_idx]
        and user_id = v_user_id;

      v_updated_ids := array_append(v_updated_ids, v_existing_ids[v_idx]);
    else
      insert into public.gastos (
        monto,
        descripcion,
        fecha,
        categoria,
        cuenta_id,
        es_msi,
        grupo_msi_id
      )
      values (
        (v_installment->>'monto')::numeric,
        v_installment->>'descripcion',
        (v_installment->>'fecha')::timestamptz,
        p_categoria,
        p_cuenta_id,
        true,
        p_grupo_msi_id
      )
      returning id into v_new_id;

      v_inserted_ids := array_append(v_inserted_ids, v_new_id);
    end if;
  end loop;

  if v_existing_count > v_new_count then
    for v_idx in (v_new_count + 1)..v_existing_count loop
      delete from public.gastos
      where id = v_existing_ids[v_idx]
        and user_id = v_user_id;

      v_deleted_ids := array_append(v_deleted_ids, v_existing_ids[v_idx]);
    end loop;
  end if;

  return jsonb_build_object(
    'updated_ids', to_jsonb(v_updated_ids),
    'inserted_ids', to_jsonb(v_inserted_ids),
    'deleted_ids', to_jsonb(v_deleted_ids)
  );
end;
$$;

grant execute on function public.update_msi_grupo(uuid, text, uuid, jsonb) to authenticated;
