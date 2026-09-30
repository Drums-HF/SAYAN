import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/SAYAN/',
  plugins: [
    react(),
    // SPEC §11 : service worker pour le shell applicatif et la table CIQUAL ; les données
    // restent en ligne (aucune requête Supabase ni Open Food Facts n'est mise en cache).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'SAYAN',
        short_name: 'SAYAN',
        lang: 'fr',
        start_url: '/SAYAN/',
        scope: '/SAYAN/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-masquable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    // Bundle principal (React, routeur, supabase-js) ; Recharts est chargé à la demande.
    chunkSizeWarningLimit: 600,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
