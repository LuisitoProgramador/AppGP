# AGENTS.md

## Cursor Cloud specific instructions

Pulso es una PWA **solo de cliente** hecha con React 19 + Vite 8 (ver `README.md` para el stack y la
estructura). No hay un backend propio: la app habla directamente con **Supabase** (Auth + Postgres).
`api/cron.ts` es un cron serverless de Vercel para notificaciones de Telegram y no es necesario para
el desarrollo local.

### Comandos estándar

Usa los scripts de npm en `package.json`: `npm run dev`, `npm run build`, `npm run preview`,
`npm run lint`, `npm run typecheck`, `npm test`. CI ejecuta lint → typecheck → test → build
(`.github/workflows/ci.yml`).

### Detalles no obvios (gotchas)

- **Los tests dependen de la zona horaria.** Varios tests de fechas/dashboard fijan días de
  calendario en `America/Mexico_City`. En una VM en UTC fallan. Ejecuta siempre los tests con esa
  zona horaria: `TZ=America/Mexico_City npm test`.
- **Se requiere `.env` para correr la app.** `src/services/supabase.js` lanza un error al importarse
  si faltan `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. `.env` está en `.gitignore`.
- **El service worker de la PWA está activo en dev** (`devOptions.enabled: true`). Hace de proxy de
  las llamadas REST a Supabase, así que un gasto guardado puede no aparecer como petición en la
  pestaña Network de DevTools aunque sí se haya guardado. Verifica las escrituras contra la base de
  datos, no contra el panel Network.
- **El botón de guardar gasto está deshabilitado hasta que seleccionas una cuenta de pago.** Con más
  de una cuenta no se autoselecciona ninguna: primero haz clic en un chip de cuenta bajo
  "¿Con qué pagaste?".

### Correr el backend local de Supabase (para pruebas end-to-end)

Se usan Docker y el CLI de Supabase para levantar un backend local autocontenido. Docker debe
iniciarse manualmente (no hay systemd en la VM) y Docker 29 necesita fuse-overlayfs con el
containerd-snapshotter deshabilitado (`/etc/docker/daemon.json`).

1. Inicia el daemon de Docker (en segundo plano) y deja el socket usable:
   `sudo dockerd > /tmp/dockerd.log 2>&1 &` y luego `sudo chmod 666 /var/run/docker.sock`
2. Levanta Supabase desde la raíz del repo: `supabase start` (API en `http://127.0.0.1:54321`,
   Studio en `http://127.0.0.1:54323`). Imprime la `anon` key.
3. Pon la URL local y la anon key en `.env` como `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. Si la base de datos está vacía, aplica el SQL de `supabase/*.sql` en orden de dependencias
   (esquemas antes que sus alters/RPCs), omitiendo `drop_gastos.sql` y `verify_rls.sql`. Orden
   sugerido: `gastos_schema` → `cuentas_schema` → `cuentas_dia_corte_alter` →
   `cuentas_dia_pago_alter` → `gastos_cuentas_msi_alter` → `gastos_offline_id_alter` →
   `gastos_recurrentes_schema` → `gastos_recurrentes_cuenta_id_alter` → `presupuestos_schema` →
   `presupuestos_onboarding_alter` → `presupuestos_ingresos_mensuales_alter` →
   `presupuestos_limite_manual_alter` → `presupuestos_porcentaje_ahorro_alter` →
   `metas_ahorro_schema` → `ingresos_cuenta_schema` → `ingresos_offline_id_alter` →
   `msi_idempotency_schema` → `notificaciones_schema` → `indexes` → `gastos_resumen_mensual_view` →
   `gastos_resumen_mensual_mx_alter` → `transferencias_rpc` → `update_gasto_simple` →
   `update_msi_grupo` → `gastos_past_edit_guard` → `security_hardening`.
   Aplica cada uno con, por ejemplo,
   `docker exec -i supabase_db_workspace psql -U postgres -d postgres < ARCHIVO.sql`.
5. **Otorga privilegios de tabla** (obligatorio; de lo contrario la app da
   `permission denied for table presupuestos`/`gastos`). Las tablas creadas directamente como
   `postgres` no reciben los grants de `anon`/`authenticated` que Supabase hospedado da por defecto:
   ```sql
   grant usage on schema public to anon, authenticated, service_role;
   grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
   grant usage, select on all sequences in schema public to anon, authenticated, service_role;
   alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
   alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
   ```
6. La confirmación por correo está deshabilitada en local (`supabase/config.toml`), así que registrar
   una cuenta desde "Crear cuenta" en la app inicia sesión de inmediato, sin paso de correo. Un
   usuario nuevo debe completar el onboarding de 4 pasos (ingresos → cuenta → gastos fijos → ahorro)
   antes de llegar al dashboard.
