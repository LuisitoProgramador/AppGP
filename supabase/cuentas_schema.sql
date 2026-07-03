-- Cuentas y métodos de pago por usuario

create type public.cuenta_tipo as enum ('efectivo', 'debito', 'credito');

create table public.cuentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nombre text not null,
  tipo public.cuenta_tipo not null,
  limite_credito decimal check (limite_credito is null or limite_credito > 0),
  saldo_actual decimal not null default 0,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.cuentas enable row level security;

create policy "Usuarios pueden ver sus cuentas"
on public.cuentas for select
using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus cuentas"
on public.cuentas for insert
with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus cuentas"
on public.cuentas for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus cuentas"
on public.cuentas for delete
using (auth.uid() = user_id);

create trigger cuentas_set_user_id
before insert on public.cuentas
for each row execute function public.set_gasto_user_id();

create index cuentas_user_id_idx on public.cuentas (user_id);
