-- Índice compuesto para consultas por usuario y fecha (historial, dashboard)
create index if not exists gastos_user_id_fecha_idx
on public.gastos (user_id, fecha desc);
