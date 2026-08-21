import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Port 3000 is pinned because the Django backend allowlists exactly
// http://localhost:3000 in CORS_ALLOWED_ORIGINS.
const DEV_PORT = 3000;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: DEV_PORT,
    strictPort: true,
    host: true,
    watch: {
      // Bind mounts on macOS/Windows Docker do not deliver inotify events.
      usePolling: process.env.VITE_USE_POLLING === 'true',
    },
  },
  preview: {
    port: DEV_PORT,
    strictPort: true,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/shared/test/**', 'src/main.tsx'],
    },
  },
});
