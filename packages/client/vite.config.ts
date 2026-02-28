import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // We use our own manifest.json in public/
      workbox: {
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Exclude PMTiles from service worker — Range requests are
        // incompatible with CacheFirst (wrong bytes served from cache).
        // Nginx already sets Cache-Control: public, immutable on /tiles/.
        navigateFallbackDenylist: [/\/tiles\//],
        runtimeCaching: [
          {
            // Cache ward boundaries API (still used by swing modeler for metadata)
            urlPattern: /\/api\/v1\/wards\/boundaries/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ward-boundaries',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Network-first for election data (may update)
            urlPattern: /\/api\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-data',
              expiration: {
                maxAgeSeconds: 60 * 60, // 1 hour
                maxEntries: 100,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-map': ['maplibre-gl', 'pmtiles'],
          'vendor-chart': ['recharts'],
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-state': ['zustand', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
