-- Registro de notificaciones ya enviadas para evitar duplicados.
-- Solo la escribe/lee el cron server-side (service role), nunca el cliente.
-- La clave (`clave`) identifica de forma única cada aviso, por ejemplo:
--   presupuesto:2026-07:100   (presupuesto del mes superado al 100%)
--   presupuesto:2026-07:80    (presupuesto del mes al 80%)
--   tarjeta:<cuenta_id>:2026-07  (recordatorio de pago del mes)
--   resumen:2026-06           (resumen mensual del mes cerrado)

create table if not exists public.notificaciones_enviadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  clave text not null,
  enviada_at timestamptz not null default timezone('utc', now()),
  unique (user_id, clave)
);

-- RLS habilitado sin políticas: bloquea a anon/authenticated.
-- El service role (cron) omite RLS y es el único que accede.
alter table public.notificaciones_enviadas enable row level security;

create index if not exists notificaciones_enviadas_user_id_idx
  on public.notificaciones_enviadas (user_id);
