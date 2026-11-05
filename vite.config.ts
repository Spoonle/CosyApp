/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Injecte une CSP assouplie uniquement en développement (HMR Vite).
 * En production, la CSP stricte provient de index.html.
 */
function devCspPlugin() {
  return {
    name: 'cozydesk:dev-csp',
    transformIndexHtml: {
      order: 'pre' as const,
      handler(html: string) {
        return html.replace(
          /<meta http-equiv="Content-Security-Policy"[^>]*>/,
          '<meta http-equiv="Content-Security-Policy" content=' +
            '"default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; ' +
            'img-src \'self\' data: blob: cozydesk-file:; media-src \'self\' blob: cozydesk-file:; ' +
            'font-src \'self\' data:; connect-src \'self\' cozydesk-file: ws://127.0.0.1:5173 http://127.0.0.1:5173 ' +
            'https://api.open-meteo.com https://geocoding-api.open-meteo.com;">'
        );
      }
    }
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'development' ? [devCspPlugin()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  build: {
    outDir: 'dist',
    target: 'chrome120',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          data: ['dexie', 'dexie-react-hooks'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true
  }
}));
