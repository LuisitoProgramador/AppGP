-- Alinea límite de descripción con la validación del cliente (200 caracteres).

alter table public.gastos
  drop constraint if exists gastos_descripcion_length_check;
alter table public.gastos
  add constraint gastos_descripcion_length_check
  check (descripcion is null or char_length(descripcion) <= 200);

alter table public.gastos_recurrentes
  drop constraint if exists gastos_recurrentes_descripcion_length_check;
alter table public.gastos_recurrentes
  add constraint gastos_recurrentes_descripcion_length_check
  check (char_length(descripcion) <= 200);

alter table public.ingresos_cuenta
  drop constraint if exists ingresos_cuenta_descripcion_length_check;
alter table public.ingresos_cuenta
  add constraint ingresos_cuenta_descripcion_length_check
  check (char_length(descripcion) <= 200);
