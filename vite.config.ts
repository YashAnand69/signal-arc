import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Opt in to the deployed API when testing a guest workflow locally.
// The production build does not contain this proxy or any server credential.
export default defineConfig({
  plugins: [react()],
  server: process.env.SIGNAL_ARC_API_PROXY ? {
    proxy: {
      '/api': {
        target: process.env.SIGNAL_ARC_API_PROXY,
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          proxy.on('proxyReq', (request) => {
            request.setHeader('origin', new URL(process.env.SIGNAL_ARC_API_PROXY!).origin);
          });
        },
      },
    },
  } : undefined,
});
