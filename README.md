# Pulso

**Pulso** es una aplicación de finanzas personales diseñada para darte claridad sobre tu dinero: registra gastos, administra cuentas, define presupuestos y sigue tu ritmo financiero con una interfaz limpia y enfocada.

Construida con React, Vite, Tailwind CSS y Supabase. Instalable como PWA y desplegable en Vercel.

## Stack

- **Frontend:** React 19 + Vite 8
- **Estilos:** Tailwind CSS v4
- **Backend:** Supabase
- **Hosting:** Vercel
- **PWA:** vite-plugin-pwa (instalable, offline básico)

## Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables (Layout, Dashboard, etc.)
├── contexts/       # Contextos de React (Auth, Cuentas, Gastos)
├── hooks/          # Custom hooks
├── services/       # Cliente Supabase y servicios API
├── utils/          # Utilidades (formatCurrency, finanzas)
├── App.tsx
├── main.tsx
└── index.css
public/             # Iconos PWA, manifest y favicon
```

## Configuración local

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env
```

3. Completar en `.env` tus credenciales de Supabase (y opcionalmente Sentry):

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_SENTRY_DSN=          # opcional: alertas de errores en producción
```

4. Para tests E2E, define `E2E_TEST_PASSWORD` en `.env` (usuario de prueba en Supabase Auth).

5. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

## Scripts

| Comando           | Descripción              |
|-------------------|--------------------------|
| `npm run dev`     | Servidor de desarrollo   |
| `npm run build`   | Build de producción      |
| `npm run preview` | Vista previa del build   |
| `npm run lint`    | Linter (Oxlint)          |
| `npm test`        | Tests (Vitest)           |
| `npm run test:e2e`| Tests E2E (Playwright)   |

## PWA

Pulso está configurada como PWA instalable en `vite.config.ts`:

- **Manifest:** nombre, iconos, tema y modo standalone
- **Service Worker:** precache de assets y caché NetworkFirst para la API de Supabase
- **Dev:** PWA habilitada también en desarrollo (`devOptions.enabled`)

Para probar la instalación, ejecuta `npm run build && npm run preview` y usa "Instalar app" en el navegador.

## Despliegue en Vercel

1. Conecta el repositorio en [Vercel](https://vercel.com)
2. Añade las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. El archivo `vercel.json` ya incluye rewrites para SPA routing

## Notificaciones de Telegram

Pulso envía **solo notificaciones útiles** por Telegram (no confirma cada gasto, para no molestar). Todas se evalúan una vez al día desde un cron server-side (`api/cron.ts`) y se deduplican en la tabla `notificaciones_enviadas`:

- **Presupuesto**: aviso al llegar al 80% y al superar el 100% del límite del mes (una vez por umbral).
- **Pago de tarjetas**: recordatorio cuando faltan 3 días o menos para el `dia_pago` de una tarjeta con saldo (una vez al mes por tarjeta).
- **Resumen mensual**: el día 1, resumen del mes cerrado por categoría vs presupuesto.

### Configuración

1. Crea un bot con [@BotFather](https://t.me/BotFather) y obtén el `TELEGRAM_BOT_TOKEN`.
2. Obtén tu `TELEGRAM_CHAT_ID` (por ejemplo escribiéndole a [@userinfobot](https://t.me/userinfobot)).
3. En Vercel, añade las variables del bloque "Notificaciones" de `.env.example` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, y opcionalmente `NOTIFY_USER_ID`).
4. Aplica las migraciones SQL en Supabase: `supabase/cuentas_dia_pago_alter.sql` y `supabase/notificaciones_schema.sql`.
5. El cron ya está declarado en `vercel.json` (`/api/cron`, diario a las 15:00 UTC ≈ 9:00 CDMX).

Para probar el cron manualmente: `curl -H "Authorization: Bearer $CRON_SECRET" https://tu-app.vercel.app/api/cron`

## Confianza e integridad de datos

Pulso maneja dinero real. El sistema no es infalible, pero varias capas reducen el riesgo de inconsistencias. Esta sección describe qué está protegido, qué no, y cómo validarlo antes de confiar plenamente en la app.

### ¿Por qué el riesgo está controlado?

**Transferencias atómicas en SQL.** La función `realizar_transferencia` (migración `supabase/migrations/20260704224500_transferencia_exception_handler.sql`) ejecuta bloqueos `FOR UPDATE`, validaciones, actualización de saldos e historial en una sola transacción. Si algo falla a mitad de una transferencia, PostgreSQL revierte todo automáticamente. No hay riesgo de que el dinero quede “en el aire” en ese flujo.

**Gastos con compensación manual.** Registrar un gasto online actualiza el saldo y luego inserta el registro en `gastos` (dos pasos en el cliente). Si el insert falla, el código revierte el saldo. No es tan fuerte como un RPC atómico, pero evita la mayoría de desfaces por error de red al guardar.

**Idempotencia al editar grupos MSI.** La tabla `msi_idempotency_keys` (`supabase/msi_idempotency_schema.sql`) evita duplicar cambios si reintentas `update_msi_grupo` con red inestable. Las compras MSI nuevas crean todas las cuotas al registrar (no hay un cobro mensual automático en servidor); la idempotencia aplica al **editar o rearmar** un grupo existente.

**Sincronización offline sin duplicados.** Los gastos e ingresos guardados sin conexión llevan `offline_id` con índice único en Supabase (`supabase/gastos_offline_id_alter.sql`). Al reconectar, el sync detecta si ya se aplicaron y no los vuelve a insertar.

**Monitoreo con Sentry (opcional).** `src/lib/sentry.ts` captura errores no manejados y rechazos de promesas, **si** configuras `VITE_SENTRY_DSN` en producción. Sin DSN, la app funciona igual pero no envía alertas.

**Precisión en cálculos financieros.** `src/utils/core/centavos.ts` (`roundMoney`, `sumMoney`) reduce errores de coma flotante en saldos, MSI, presupuesto y dashboard. La base de datos redondea a 2 decimales; la UI valida montos con la misma lógica donde importa.

### ¿Qué hacer para ganar confianza?

Si la preocupación es “¿y si algo falla?”, la forma práctica de comprobarlo es validar en un entorno controlado:

1. **Modo paralelo (1 semana).** No migres toda tu vida financiera de golpe. Registra transacciones en paralelo con tu método actual, o usa una cuenta con poco saldo.
2. **Verificación manual.** Compara el `saldo_actual` del dashboard contra el saldo real de tu banco. Tras una semana de uso intenso (ingresos, gastos MSI, transferencias), si los números coinciden, puedes confiar en el sistema para el día a día.
3. **Tests E2E.** Ejecuta `npm run test:e2e` tras cambios grandes. Los specs en `e2e/` cubren MSI, transferencias, pago a tarjeta y sync offline; son *smoke tests*, no una auditoría completa.

### Límites conocidos

| Área | Qué protege | Qué no cubre |
|------|-------------|--------------|
| `realizar_transferencia` | Atomicidad total en transferencias y pagos a tarjeta | Gastos, ingresos ni edición manual de saldos |
| `msi_idempotency_keys` | Reintentos al editar un grupo MSI | Creación inicial de gastos ni operaciones offline (usa `offline_id`) |
| Sentry | Errores del cliente en producción | Requiere `VITE_SENTRY_DSN`; no monitorea el cron de servidor |
| `centavos.ts` | Cálculos críticos en TypeScript | SQL usa `round(..., 2)`; no todas las comparaciones en UI |
| E2E Playwright | MSI (deuda), transferencia interna, pago a tarjeta, gasto offline + sync | Idempotencia MSI al editar, otros flujos menores |

## Supabase

Importa el cliente desde `src/services/supabase.ts`:

```ts
import { supabase } from './services/supabase'
```

El cliente valida que existan las variables de entorno al importarse.
