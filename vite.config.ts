import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000, // chunk size 경고 한계를 1000kB로 증가
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'genai-vendor': ['@google/genai'],
          'axios-vendor': ['axios']
        }
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  }
});
