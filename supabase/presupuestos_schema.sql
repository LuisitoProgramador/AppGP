-- Límite mensual por usuario

create table if not exists public.presupuestos (
  user_id uuid primary key references auth.users on delete cascade,
  limite_mensual decimal not null default 10000 check (limite_mensual > 0),
  updated_at timestamptz default timezone('utc', now()) not null
);

alter table public.presupuestos enable row level security;

create policy "Usuarios pueden ver su presupuesto"
on public.presupuestos for select
using (auth.uid() = user_id);

create policy "Usuarios pueden insertar su presupuesto"
on public.presupuestos for insert
with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar su presupuesto"
on public.presupuestos for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
