import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      /\.ngrok-free\.dev$/,  // Allow all ngrok free domains
      /\.ngrok\.io$/,        // Allow all ngrok domains
    ],
    proxy: {
      '/api': 'http://localhost:3001',
      // WebSocket should NOT go through Vite proxy - connect directly to server
    },
  },
});
