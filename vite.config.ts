import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts'
          if (id.includes('@tanstack/react-virtual')) return 'vendor-virtual'
          if (id.includes('sonner')) return 'vendor-sonner'
          if (id.includes('idb')) return 'vendor-idb'
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icon.svg',
        'icons.svg',
        'manifest.json',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Pulso',
        short_name: 'Pulso',
        description: 'Control financiero personal con claridad y enfoque',
        theme_color: '#242424',
        background_color: '#242424',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Nuevo Gasto',
            short_name: 'Gasto',
            description: 'Registra un gasto rápidamente',
            url: '/?tab=registro',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Gasto $100',
            short_name: '$100',
            description: 'Registro rápido con monto prellenado',
            url: '/?tab=registro&m=100',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest,json}'],
        globIgnores: ['**/vendor-recharts-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/vendor-recharts-[^/]+\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'recharts-chunks',
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            // Nunca cachear auth: rompe refresh de token y cierra sesión en Safari/PWA.
            urlPattern: ({ url }) => /\/auth\/v1\//.test(url.pathname),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url, request }) =>
              /\.supabase\.co$/i.test(url.hostname) &&
              url.pathname.startsWith('/rest/v1/') &&
              request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
