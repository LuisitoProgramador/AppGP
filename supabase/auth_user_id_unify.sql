-- Unifica triggers de user_id bajo set_auth_user_id() (antes set_gasto_user_id / set_ingreso_cuenta_user_id).

create or replace function public.set_auth_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

-- gastos
drop trigger if exists gastos_set_user_id on public.gastos;
create trigger gastos_set_user_id
before insert on public.gastos
for each row execute function public.set_auth_user_id();

-- cuentas
drop trigger if exists cuentas_set_user_id on public.cuentas;
create trigger cuentas_set_user_id
before insert on public.cuentas
for each row execute function public.set_auth_user_id();

-- metas_ahorro
drop trigger if exists metas_ahorro_set_user_id on public.metas_ahorro;
create trigger metas_ahorro_set_user_id
before insert on public.metas_ahorro
for each row execute function public.set_auth_user_id();

-- gastos_recurrentes
drop trigger if exists gastos_recurrentes_set_user_id on public.gastos_recurrentes;
create trigger gastos_recurrentes_set_user_id
before insert on public.gastos_recurrentes
for each row execute function public.set_auth_user_id();

-- ingresos_cuenta
drop trigger if exists ingresos_cuenta_set_user_id on public.ingresos_cuenta;
create trigger ingresos_cuenta_set_user_id
before insert on public.ingresos_cuenta
for each row execute function public.set_auth_user_id();

drop function if exists public.set_gasto_user_id();
drop function if exists public.set_ingreso_cuenta_user_id();

revoke all on function public.set_auth_user_id() from public;
revoke all on function public.set_auth_user_id() from anon;
revoke all on function public.set_auth_user_id() from authenticated;
