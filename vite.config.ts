import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Proxy /api/run to Express backend in local dev
  server: {
    proxy: {
      '/api/run': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
