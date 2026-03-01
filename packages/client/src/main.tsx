import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/queryClient';
import { router } from '@/routes';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

// Service worker registration is handled automatically by vite-plugin-pwa
// (registerType: 'autoUpdate' with skipWaiting: true).
// VitePWA injects registerSW.js into index.html, which handles:
// - SW registration
// - Update detection (new SW available)
// - Auto-reload when new SW activates (via controllerchange event)
// Do NOT manually register here — it conflicts with the auto-update lifecycle.
