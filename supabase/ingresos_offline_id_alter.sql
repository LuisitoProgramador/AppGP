-- Idempotencia de sync offline para ingresos en cola

alter table public.ingresos_cuenta
  add column if not exists offline_id uuid;

create unique index if not exists ingresos_cuenta_user_offline_id_uidx
  on public.ingresos_cuenta (user_id, offline_id)
  where offline_id is not null;
