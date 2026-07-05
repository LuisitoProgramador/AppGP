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

-- Retención: purgar claves > 2 días (invocar desde cron con service role).
create or replace function public.purge_msi_idempotency_keys(
  older_than interval default interval '2 days'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.msi_idempotency_keys
  where created_at < timezone('utc', now()) - older_than;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_msi_idempotency_keys(interval) from public;
grant execute on function public.purge_msi_idempotency_keys(interval) to service_role;
