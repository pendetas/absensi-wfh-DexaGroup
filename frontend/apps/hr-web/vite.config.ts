import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Proxied to one origin, as behind nginx in Docker: the session cookie stays same-origin, no CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Leaflet is lazy-imported; pre-bundling it avoids a re-bundle and reload when a map first opens.
  optimizeDeps: { include: ['leaflet'] },
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3000' },
  },
});
