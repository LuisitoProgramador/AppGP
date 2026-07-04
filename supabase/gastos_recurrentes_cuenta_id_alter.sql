-- Vincula cada gasto recurrente a la cuenta que debe afectarse al registrarse

alter table public.gastos_recurrentes
  add column if not exists cuenta_id uuid references public.cuentas (id) on delete set null;

create index if not exists gastos_recurrentes_cuenta_id_idx
  on public.gastos_recurrentes (cuenta_id);
