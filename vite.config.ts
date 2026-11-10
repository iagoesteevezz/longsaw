/**
 * Vite config.
 *
 * Decisión: la app es 100 % estática y todo ocurre en el navegador: no hay
 * servidor, API ni peticiones externas. Se puede servir desde cualquier CDN.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages sirve la web en /longsaw/ (ver .github/workflows/pages.yml).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
