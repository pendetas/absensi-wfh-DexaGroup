import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The API is proxied so the browser sees one origin, as it will behind nginx in Docker.
// That keeps the session cookie same-origin and needs no CORS in development.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3000' },
  },
});
