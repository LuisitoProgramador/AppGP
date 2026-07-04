-- Límite mensual por usuario

create table if not exists public.presupuestos (
  user_id uuid primary key references auth.users on delete cascade,
  limite_mensual decimal not null default 10000 check (limite_mensual > 0),
  sueldo_mensual decimal check (sueldo_mensual is null or sueldo_mensual > 0),
  ingresos_extras decimal not null default 0 check (ingresos_extras >= 0),
  sueldo_semanal decimal check (sueldo_semanal is null or sueldo_semanal > 0),
  dia_pago smallint check (dia_pago is null or (dia_pago >= 0 and dia_pago <= 6)),
  porcentaje_ahorro smallint check (porcentaje_ahorro is null or (porcentaje_ahorro >= 1 and porcentaje_ahorro <= 100)),
  limite_es_manual boolean not null default false,
  updated_at timestamptz default timezone('utc', now()) not null
);

alter table public.presupuestos enable row level security;

create policy "Usuarios pueden ver su presupuesto"
on public.presupuestos for select
using ((select auth.uid()) = user_id);

create policy "Usuarios pueden insertar su presupuesto"
on public.presupuestos for insert
with check ((select auth.uid()) = user_id);

create policy "Usuarios pueden actualizar su presupuesto"
on public.presupuestos for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
