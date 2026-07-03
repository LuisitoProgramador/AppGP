-- Elimina el esquema anterior de la tabla gastos (políticas, trigger, función y tabla)
drop policy if exists "Usuarios pueden ver sus propios gastos" on public.gastos;
drop policy if exists "Usuarios pueden insertar sus propios gastos" on public.gastos;
drop policy if exists "Usuarios pueden actualizar sus propios gastos" on public.gastos;
drop policy if exists "Usuarios pueden eliminar sus propios gastos" on public.gastos;
drop policy if exists "Permitir insert público" on public.gastos;
drop policy if exists "Permitir select público" on public.gastos;

drop trigger if exists gastos_set_user_id on public.gastos;
drop function if exists public.set_gasto_user_id();

drop table if exists public.gastos cascade;
