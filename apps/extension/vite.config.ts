import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const backgroundEntry = fileURLToPath(new URL('./src/background.ts', import.meta.url));
const defaultPort = 3001;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '');
  const configuredPort = Number.parseInt(env.VITE_APP_PORT ?? '', 10);

  return {
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: fileURLToPath(new URL('./index.html', import.meta.url)),
          background: backgroundEntry,
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'background.js';
            }

            return 'assets/[name]-[hash].js';
          },
        },
      },
    },
    server: {
      port: Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : defaultPort,
    },
  };
});
