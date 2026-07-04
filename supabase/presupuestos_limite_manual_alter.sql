-- Límite manual vs derivado de estrategia (onboarding)
alter table public.presupuestos
  add column if not exists limite_es_manual boolean not null default false;
