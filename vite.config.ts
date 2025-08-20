import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': {}, // avoids “process is not defined” in some deps
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
      globals: { Buffer: true, global: true },
    }),
  ],
  server: {
    port: 3001,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer', // ensure lowercase 'buffer' resolves
    },
  },
});
