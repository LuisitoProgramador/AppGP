# AGENTS.md

## Cursor Cloud specific instructions

Pulso is a **client-only** React 19 + Vite 8 PWA (see `README.md` for stack/structure). There is no
custom backend server: the app talks directly to **Supabase** (Auth + Postgres). `api/cron.ts` is a
Vercel serverless cron for Telegram notifications and is not needed for local development.

### Standard commands

Use the npm scripts in `package.json`: `npm run dev`, `npm run build`, `npm run preview`,
`npm run lint`, `npm run typecheck`, `npm test`. CI runs lint → typecheck → test → build
(`.github/workflows/ci.yml`).

### Non-obvious gotchas

- **Tests are timezone-sensitive.** Several date/dashboard tests hard-code `America/Mexico_City`
  calendar days. On a UTC VM they fail. Always run tests with that timezone:
  `TZ=America/Mexico_City npm test`.
- **`npm run typecheck` has pre-existing type errors** on `main` (e.g. in `src/services/categorias.ts`,
  `src/services/metasAhorro/sync.ts`, unused vars). These are not caused by the environment; do not
  treat them as setup breakage.
- **`.env` is required to run the app.** `src/services/supabase.js` throws at import time if
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing. `.env` is gitignored.
- **PWA service worker is enabled in dev** (`devOptions.enabled: true`). It proxies Supabase REST
  calls, so a saved expense may not appear as a request in the DevTools Network tab even though it
  succeeded. Verify writes against the DB, not the Network panel.
- **Expense form submit button is disabled until a payment account is selected.** With more than one
  account, none is auto-selected — click an account chip under "¿Con qué pagaste?" first.

### Running the local Supabase backend (for end-to-end testing)

Docker and the Supabase CLI are used to run a self-contained local backend. Docker must be started
manually (no systemd in the VM), and Docker 29 needs fuse-overlayfs with the containerd snapshotter
disabled (`/etc/docker/daemon.json`).

1. Start the Docker daemon (background) and make the socket usable:
   `sudo dockerd > /tmp/dockerd.log 2>&1 &` then `sudo chmod 666 /var/run/docker.sock`
2. Start Supabase from the repo root: `supabase start` (API on `http://127.0.0.1:54321`,
   Studio on `http://127.0.0.1:54323`). It prints the `anon` key.
3. Put the local URL + anon key in `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. If the database is fresh, apply the SQL in `supabase/*.sql` in dependency order (schemas before
   their alters/RPCs), skipping `drop_gastos.sql` and `verify_rls.sql`. Suggested order:
   `gastos_schema` → `cuentas_schema` → `cuentas_dia_corte_alter` → `cuentas_dia_pago_alter` →
   `gastos_cuentas_msi_alter` → `gastos_offline_id_alter` → `gastos_recurrentes_schema` →
   `gastos_recurrentes_cuenta_id_alter` → `presupuestos_schema` → `presupuestos_onboarding_alter` →
   `presupuestos_ingresos_mensuales_alter` → `presupuestos_limite_manual_alter` →
   `presupuestos_porcentaje_ahorro_alter` → `metas_ahorro_schema` → `ingresos_cuenta_schema` →
   `ingresos_offline_id_alter` → `msi_idempotency_schema` → `notificaciones_schema` → `indexes` →
   `gastos_resumen_mensual_view` → `gastos_resumen_mensual_mx_alter` → `transferencias_rpc` →
   `update_gasto_simple` → `update_msi_grupo` → `gastos_past_edit_guard` → `security_hardening`.
   Apply each with e.g. `docker exec -i supabase_db_workspace psql -U postgres -d postgres < FILE.sql`.
5. **Grant table privileges** (required, otherwise the app hits `permission denied for table
   presupuestos`/`gastos`). Tables created directly as `postgres` do not get the `anon`/`authenticated`
   grants that hosted Supabase provides by default:
   ```sql
   grant usage on schema public to anon, authenticated, service_role;
   grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
   grant usage, select on all sequences in schema public to anon, authenticated, service_role;
   alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
   alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
   ```
6. Email confirmations are disabled locally (`supabase/config.toml`), so registering an account via
   the app's "Crear cuenta" logs you straight in — no email step. A new user must complete the 4-step
   onboarding (income → account → fixed expenses → savings) before reaching the dashboard.
