import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // /api runs as Vercel Functions in production; locally scripts/dev-api.mjs serves the same handlers
  server: { port: 5199, host: true, proxy: { '/api': 'http://localhost:3101' } },
  build: {
    // three.js lives in the lazily-loaded 3D chunk; it's big but off the critical path
    chunkSizeWarningLimit: 1100
  }
});
