-- Tasa de interés mensual opcional para tarjetas de crédito (sincronizada entre dispositivos).

alter table public.cuentas
  add column if not exists tasa_interes_mensual decimal
  check (tasa_interes_mensual is null or (tasa_interes_mensual > 0 and tasa_interes_mensual <= 100));
