import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        // Ativa o novo SW imediatamente, sem esperar fechar todas as abas
        skipWaiting: true,
        clientsClaim: true,
        // Não deixa o HTML do app ser servido do cache (sempre busca na rede)
        navigateFallback: null,
        runtimeCaching: [
          {
            // Navegação (index.html): sempre busca na rede, cai no cache só offline
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
            // JS/CSS/imagens dos assets buildados: cache com revalidação
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
            },
          },
          {
            // Ícones e demais arquivos estáticos
            urlPattern: ({ url }) =>
              ['.png', '.jpg', '.ico', '.svg', '.webmanifest'].some((ext) =>
                url.pathname.endsWith(ext)
              ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'Colégio Verdy',
        short_name: 'Verdy',
        description: 'Aplicativo do Colégio Verdy',
        lang: 'pt-BR',
        theme_color: '#064e3b',
        background_color: '#064e3b',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
