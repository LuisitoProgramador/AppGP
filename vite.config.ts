import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Recharts + Supabase superan 500 kB; las gráficas ya van en lazy imports.
    chunkSizeWarningLimit: 600,
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
        theme_color: '#0a0f1a',
        background_color: '#0a0f1a',
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
            short_name: 'Nuevo Gasto',
            description: 'Registra un gasto rápidamente',
            url: '/?q=',
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
        runtimeCaching: [
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
