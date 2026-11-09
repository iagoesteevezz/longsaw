/**
 * Vite config.
 *
 * Decisión: el frontend es 100 % estático (se puede servir desde cualquier CDN
 * gratis). La única pieza con servidor es el proxy del LLM (server/llm-proxy.mjs),
 * que en desarrollo se expone a través del proxy de Vite en /api para evitar CORS.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
