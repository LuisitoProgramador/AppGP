-- Bloquea edición de gastos con fecha pasada (defensa en profundidad).
-- Compara fechas en America/Mexico_City (misma zona que el cliente).
-- update_msi_grupo activa app.bypass_past_gasto_guard para redistribuir cuotas MSI.
-- Ejecutar en el SQL Editor de Supabase después de update_msi_grupo.sql

create or replace function public.guard_gasto_past_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_setting('app.bypass_past_gasto_guard', true) = 'true' then
    return new;
  end if;

  if (old.fecha at time zone 'America/Mexico_City')::date >= (now() at time zone 'America/Mexico_City')::date then
    return new;
  end if;

  if coalesce(old.es_msi, false) and old.grupo_msi_id is not null then
    raise exception 'No puedes editar cuotas MSI pasadas individualmente';
  end if;

  raise exception 'No puedes editar gastos con fecha pasada';
end;
$$;

drop trigger if exists gastos_guard_past_update on public.gastos;

create trigger gastos_guard_past_update
before update on public.gastos
for each row execute function public.guard_gasto_past_update();
