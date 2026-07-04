-- Idempotencia de sync offline: una fila marcadora por gasto en cola (pending.id)
-- Para MSI, solo la primera cuota lleva offline_id; el grupo se valida por grupo_msi_id.

alter table public.gastos
  add column if not exists offline_id uuid;

create unique index if not exists gastos_user_offline_id_uidx
  on public.gastos (user_id, offline_id)
  where offline_id is not null;

create index if not exists gastos_offline_id_idx on public.gastos (offline_id)
  where offline_id is not null;
