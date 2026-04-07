import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(() => {
    return {
      server: {
        port: 5200,
        host: true,
        strictPort: true,
        hmr: {
          protocol: 'ws',
          host: '127.0.0.1',
          port: 5200,
        },
        watch: {
          usePolling: true,
          interval: 500,
          ignored: ['**/.git.bak/**', '**/Project/**', '**/node_modules/**', '**/*.xlsx', '**/*.exe', '**/dist/**', '**/*.json', '**/*.csv'],
        },
      },
      plugins: [tailwindcss(), react()],
      // API keys removed — Gemini calls go through Firebase Cloud Functions now
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              'charts': ['recharts'],
            }
          }
        }
      }
    };
});
