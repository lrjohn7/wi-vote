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
        clientsClaim: true,
        // Precache core vendor chunks only — NOT index.html.
        // HTML is handled via NetworkFirst navigation route below so users
        // always get the latest app shell after deploys (no stale flash).
        globPatterns: ['assets/vendor-react-*.js', 'assets/vendor-state-*.js', 'assets/index-*.css'],
        // Disable precache-based navigation fallback since we use NetworkFirst for HTML.
        navigateFallback: null,
        // Exclude PMTiles from service worker — Range requests are
        // incompatible with CacheFirst (wrong bytes served from cache).
        // Nginx already sets Cache-Control: public, immutable on /tiles/.
        navigateFallbackDenylist: [/\/tiles\//],
        runtimeCaching: [
          {
            // HTML navigation — always try network first so deploys are
            // picked up immediately. Falls back to cache for offline use.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 5,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Lazy-loaded JS/CSS chunks — cache after first visit
            urlPattern: /\/assets\/.+\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-chunks',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Static assets (images, fonts, icons)
            urlPattern: /\/assets\/.+\.(svg|png|woff2|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache ward boundaries API (still used by swing modeler for metadata)
            urlPattern: /\/api\/v1\/wards\/boundaries/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ward-boundaries',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
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
              cacheableResponse: {
                statuses: [0, 200],
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
    chunkSizeWarningLimit: 1100, // vendor-map (maplibre-gl) is ~1,042 KB and can't be split
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-map': ['maplibre-gl', 'pmtiles'],
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
