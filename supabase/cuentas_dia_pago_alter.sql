-- Día límite de pago para tarjetas de crédito (opcional)
-- Usado por el recordatorio de pago de tarjetas (api/cron.ts)

alter table public.cuentas
  add column if not exists dia_pago smallint check (dia_pago is null or (dia_pago >= 1 and dia_pago <= 31));
