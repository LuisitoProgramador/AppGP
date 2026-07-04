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

3. Completar en `.env` tus credenciales de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

4. Iniciar el servidor de desarrollo:

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

## Supabase

Importa el cliente desde `src/services/supabase.ts`:

```ts
import { supabase } from './services/supabase'
```

El cliente valida que existan las variables de entorno al importarse.
