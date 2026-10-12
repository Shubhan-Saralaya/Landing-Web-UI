import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the axum server (cargo run in ../server) handles /api and /auth.
const backend = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/auth': backend,
    },
  },
  build: {
    // three.js lives in its own lazily-loaded chunk; it's big by nature.
    chunkSizeWarningLimit: 1200,
  },
});
