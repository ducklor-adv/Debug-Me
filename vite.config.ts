import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: true,
        strictPort: true,
        hmr: {
          protocol: 'ws',
          host: '127.0.0.1',
          port: 5173,
        },
        watch: {
          usePolling: true,
          interval: 1000,
          ignored: ['**/.git.bak/**'],
        },
      },
      plugins: [tailwindcss(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
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
