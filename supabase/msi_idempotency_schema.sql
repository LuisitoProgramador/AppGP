-- Claves de idempotencia para update_msi_grupo (reintentos seguros con red inestable).
-- Ejecutar antes de update_msi_grupo.sql si aún no existe la tabla.

create table if not exists public.msi_idempotency_keys (
  idempotency_key uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists msi_idempotency_keys_user_created_idx
  on public.msi_idempotency_keys (user_id, created_at desc);

alter table public.msi_idempotency_keys enable row level security;

drop policy if exists "Usuarios ven sus idempotency keys" on public.msi_idempotency_keys;
create policy "Usuarios ven sus idempotency keys"
on public.msi_idempotency_keys for select
using (auth.uid() = user_id);

drop policy if exists "Usuarios insertan sus idempotency keys" on public.msi_idempotency_keys;
create policy "Usuarios insertan sus idempotency keys"
on public.msi_idempotency_keys for insert
with check (auth.uid() = user_id);
