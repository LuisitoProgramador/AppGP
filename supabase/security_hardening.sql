-- Revoca ejecución RPC de funciones trigger SECURITY DEFINER
revoke all on function public.set_auth_user_id() from public;
revoke all on function public.set_auth_user_id() from anon;
revoke all on function public.set_auth_user_id() from authenticated;

-- RLS: auth.uid() una sola vez por query (initplan)
-- gastos
drop policy if exists "Usuarios pueden ver sus propios gastos" on public.gastos;
create policy "Usuarios pueden ver sus propios gastos"
on public.gastos for select
using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden insertar sus propios gastos" on public.gastos;
create policy "Usuarios pueden insertar sus propios gastos"
on public.gastos for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden actualizar sus propios gastos" on public.gastos;
create policy "Usuarios pueden actualizar sus propios gastos"
on public.gastos for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden eliminar sus propios gastos" on public.gastos;
create policy "Usuarios pueden eliminar sus propios gastos"
on public.gastos for delete
using ((select auth.uid()) = user_id);

-- cuentas
drop policy if exists "Usuarios pueden ver sus cuentas" on public.cuentas;
create policy "Usuarios pueden ver sus cuentas"
on public.cuentas for select
using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden insertar sus cuentas" on public.cuentas;
create policy "Usuarios pueden insertar sus cuentas"
on public.cuentas for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden actualizar sus cuentas" on public.cuentas;
create policy "Usuarios pueden actualizar sus cuentas"
on public.cuentas for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden eliminar sus cuentas" on public.cuentas;
create policy "Usuarios pueden eliminar sus cuentas"
on public.cuentas for delete
using ((select auth.uid()) = user_id);

-- presupuestos
drop policy if exists "Usuarios pueden ver su presupuesto" on public.presupuestos;
create policy "Usuarios pueden ver su presupuesto"
on public.presupuestos for select
using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden insertar su presupuesto" on public.presupuestos;
create policy "Usuarios pueden insertar su presupuesto"
on public.presupuestos for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden actualizar su presupuesto" on public.presupuestos;
create policy "Usuarios pueden actualizar su presupuesto"
on public.presupuestos for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- metas_ahorro
drop policy if exists "Usuarios pueden ver sus metas de ahorro" on public.metas_ahorro;
create policy "Usuarios pueden ver sus metas de ahorro"
on public.metas_ahorro for select
using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden insertar sus metas de ahorro" on public.metas_ahorro;
create policy "Usuarios pueden insertar sus metas de ahorro"
on public.metas_ahorro for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden actualizar sus metas de ahorro" on public.metas_ahorro;
create policy "Usuarios pueden actualizar sus metas de ahorro"
on public.metas_ahorro for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden eliminar sus metas de ahorro" on public.metas_ahorro;
create policy "Usuarios pueden eliminar sus metas de ahorro"
on public.metas_ahorro for delete
using ((select auth.uid()) = user_id);

-- gastos_recurrentes
drop policy if exists "Usuarios pueden ver sus gastos recurrentes" on public.gastos_recurrentes;
create policy "Usuarios pueden ver sus gastos recurrentes"
on public.gastos_recurrentes for select
using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden insertar sus gastos recurrentes" on public.gastos_recurrentes;
create policy "Usuarios pueden insertar sus gastos recurrentes"
on public.gastos_recurrentes for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden actualizar sus gastos recurrentes" on public.gastos_recurrentes;
create policy "Usuarios pueden actualizar sus gastos recurrentes"
on public.gastos_recurrentes for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios pueden eliminar sus gastos recurrentes" on public.gastos_recurrentes;
create policy "Usuarios pueden eliminar sus gastos recurrentes"
on public.gastos_recurrentes for delete
using ((select auth.uid()) = user_id);

-- msi_idempotency_keys
drop policy if exists "Usuarios ven sus idempotency keys" on public.msi_idempotency_keys;
create policy "Usuarios ven sus idempotency keys"
on public.msi_idempotency_keys for select
using ((select auth.uid()) = user_id);

drop policy if exists "Usuarios insertan sus idempotency keys" on public.msi_idempotency_keys;
create policy "Usuarios insertan sus idempotency keys"
on public.msi_idempotency_keys for insert
with check ((select auth.uid()) = user_id);
