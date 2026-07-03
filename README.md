# Gastos Personales (PWA)

App de gastos personales construida con React, Vite, Tailwind CSS y Supabase. Desplegable en Vercel.

## Stack

- **Frontend:** React 19 + Vite 8
- **Estilos:** Tailwind CSS v4
- **Backend:** Supabase
- **Hosting:** Vercel
- **PWA:** vite-plugin-pwa (instalable, offline básico)

## Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables (Layout, etc.)
├── contexts/       # Contextos de React (AuthContext)
├── hooks/          # Custom hooks (useAuth)
├── pages/          # Vistas/páginas de la app
├── services/       # Cliente Supabase y servicios API
├── utils/          # Utilidades (formatCurrency, formatDate)
├── assets/         # Imágenes y recursos estáticos
├── App.jsx
├── main.jsx
└── index.css
public/             # Iconos PWA y favicon
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

| Comando         | Descripción                    |
|-----------------|--------------------------------|
| `npm run dev`   | Servidor de desarrollo         |
| `npm run build` | Build de producción            |
| `npm run preview` | Vista previa del build       |
| `npm run lint`  | Linter (Oxlint)                |

## PWA

La app está configurada como PWA instalable en `vite.config.js`:

- **Manifest:** nombre, iconos, tema y modo standalone
- **Service Worker:** precache de assets y caché NetworkFirst para la API de Supabase
- **Dev:** PWA habilitada también en desarrollo (`devOptions.enabled`)

Para probar la instalación, ejecuta `npm run build && npm run preview` y usa "Instalar app" en el navegador.

## Despliegue en Vercel

1. Conecta el repositorio en [Vercel](https://vercel.com)
2. Añade las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. El archivo `vercel.json` ya incluye rewrites para SPA routing

## Supabase

Importa el cliente desde `src/services/supabase.js`:

```js
import { supabase } from './services/supabase'
```

El cliente valida que existan las variables de entorno al importarse.
